// /api/pull-shopify.js — Pulls order data from Shopify and returns daily metrics
// Usage: GET /api/pull-shopify?shop=noody-skincare.myshopify.com&days=30
import { kv } from '@vercel/kv';

const API_VERSION = '2024-10';

async function shopifyFetch(shop, token, path) {
  const url = `https://${shop}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2') * 1000;
    await new Promise(r => setTimeout(r, retryAfter));
    return shopifyFetch(shop, token, path);
  }

  if (!res.ok) {
    throw new Error(`Shopify API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const linkHeader = res.headers.get('link');
  let nextPath = null;
  if (linkHeader) {
    const match = linkHeader.match(/<https:\/\/[^/]+(.+?)>;\s*rel="next"/);
    if (match) nextPath = match[1];
  }

  return { data, nextPath };
}

async function fetchAllOrders(shop, token, sinceDate) {
  let allOrders = [];
  let path = `/orders.json?status=any&limit=250&created_at_min=${sinceDate}T00:00:00Z&fields=id,created_at,total_price,subtotal_price,total_tax,total_discounts,total_shipping_price_set,financial_status,refunds,line_items,customer,source_name,referring_site,order_number,cancelled_at,currency`;

  while (path) {
    const result = await shopifyFetch(shop, token, path);
    const orders = result.data.orders || [];
    allOrders = allOrders.concat(orders);
    path = result.nextPath;

    // Safety: max 50 pages (~12,500 orders)
    if (allOrders.length > 12500) break;
  }

  return allOrders;
}

function processOrdersToDaily(orders, timezone = 'Pacific/Auckland') {
  const dailyMap = {};

  for (const order of orders) {
    if (order.cancelled_at && order.financial_status === 'voided') continue;

    const date = order.created_at.split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = {
        date, revenue: 0, orders: 0, newCustomerOrders: 0,
        returningCustomerOrders: 0, itemsSold: 0, totalTax: 0,
        totalDiscounts: 0, totalShipping: 0, refundAmount: 0,
        customerIds: new Set(),
      };
    }

    const day = dailyMap[date];
    day.revenue += parseFloat(order.total_price) || 0;
    day.orders += 1;
    day.totalTax += parseFloat(order.total_tax) || 0;
    day.totalDiscounts += parseFloat(order.total_discounts) || 0;
    day.totalShipping += parseFloat(order.total_shipping_price_set?.shop_money?.amount || 0);

    if (order.customer) {
      if (order.customer.orders_count <= 1) day.newCustomerOrders += 1;
      else day.returningCustomerOrders += 1;
      day.customerIds.add(order.customer.id);
    }

    if (order.line_items) {
      for (const item of order.line_items) {
        day.itemsSold += item.quantity || 0;
      }
    }

    if (order.refunds) {
      for (const refund of order.refunds) {
        if (refund.transactions) {
          for (const txn of refund.transactions) {
            day.refundAmount += parseFloat(txn.amount) || 0;
          }
        }
      }
    }
  }

  return Object.values(dailyMap)
    .map(day => ({
      date: day.date,
      revenue: Math.round(day.revenue * 100) / 100,
      orders: day.orders,
      newCustomerOrders: day.newCustomerOrders,
      returningCustomerOrders: day.returningCustomerOrders,
      itemsSold: day.itemsSold,
      uniqueCustomers: day.customerIds.size,
      aov: day.orders > 0 ? Math.round((day.revenue / day.orders) * 100) / 100 : 0,
      newCustomerPct: day.orders > 0 ? Math.round((day.newCustomerOrders / day.orders) * 1000) / 10 : 0,
      totalTax: Math.round(day.totalTax * 100) / 100,
      totalDiscounts: Math.round(day.totalDiscounts * 100) / 100,
      totalShipping: Math.round(day.totalShipping * 100) / 100,
      refundAmount: Math.round(day.refundAmount * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default async function handler(req, res) {
  // CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const shop = req.query.shop || process.env.SHOPIFY_STORE;
  const days = parseInt(req.query.days) || 30;

  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter or SHOPIFY_STORE env var' });
  }

  // Check auth
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    const token = await kv.get(`shopify:${shop}:token`);
    if (!token) {
      return res.status(401).json({
        error: 'No Shopify token found',
        action: `Visit /api/install?shop=${shop} to connect`,
      });
    }

    const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const orders = await fetchAllOrders(shop, token, sinceDate);
    const dailyData = processOrdersToDaily(orders);

    // Store latest pull in KV
    await kv.set(`shopify:${shop}:last_pull`, {
      timestamp: new Date().toISOString(),
      days: dailyData.length,
      totalOrders: orders.length,
    });

    // Also cache the daily data
    await kv.set(`shopify:${shop}:daily_data`, JSON.stringify(dailyData));

    res.status(200).json({
      shop,
      pulledAt: new Date().toISOString(),
      dateRange: {
        start: dailyData[0]?.date,
        end: dailyData[dailyData.length - 1]?.date,
      },
      summary: {
        totalOrders: orders.length,
        totalDays: dailyData.length,
        totalRevenue: dailyData.reduce((s, d) => s + d.revenue, 0),
      },
      daily: dailyData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
