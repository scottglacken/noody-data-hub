// /api/cron-pull.js — Runs daily at 7am NZST via Vercel Cron
// Pulls Shopify orders + Meta ad spend and caches results
import { kv } from '@vercel/kv';

const API_VERSION = '2024-10';

async function pullShopify(shop, token) {
  const sinceDate = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]; // Last 2 days
  let orders = [];
  let path = `/orders.json?status=any&limit=250&created_at_min=${sinceDate}T00:00:00Z&fields=id,created_at,total_price,total_tax,total_discounts,total_shipping_price_set,financial_status,line_items,customer,cancelled_at`;

  while (path) {
    const res = await fetch(`https://${shop}/admin/api/${API_VERSION}${path}`, {
      headers: { 'X-Shopify-Access-Token': token },
    });
    if (!res.ok) throw new Error(`Shopify ${res.status}`);
    const data = await res.json();
    orders = orders.concat(data.orders || []);

    const link = res.headers.get('link');
    const match = link?.match(/<https:\/\/[^/]+(.+?)>;\s*rel="next"/);
    path = match ? match[1] : null;
  }

  return orders;
}

async function pullMeta(token, accountId) {
  const sinceDate = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  const untilDate = new Date().toISOString().split('T')[0];

  const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?` +
    `fields=spend,impressions,clicks,actions,action_values` +
    `&time_range={"since":"${sinceDate}","until":"${untilDate}"}` +
    `&time_increment=1&level=account&access_token=${token}`;

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { shopify: null, meta: null, errors: [] };
  const shop = process.env.SHOPIFY_STORE;

  // Pull Shopify
  try {
    const shopifyToken = await kv.get(`shopify:${shop}:token`);
    if (shopifyToken) {
      const orders = await pullShopify(shop, shopifyToken);
      // Merge with existing cached data
      const existingRaw = await kv.get(`shopify:${shop}:daily_data`);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      // Process new orders into daily buckets
      const newDays = {};
      for (const order of orders) {
        if (order.cancelled_at && order.financial_status === 'voided') continue;
        const date = order.created_at.split('T')[0];
        if (!newDays[date]) {
          newDays[date] = { date, revenue: 0, orders: 0, newCustomerOrders: 0, returningCustomerOrders: 0, itemsSold: 0, totalTax: 0, totalDiscounts: 0, totalShipping: 0, refundAmount: 0 };
        }
        const d = newDays[date];
        d.revenue += parseFloat(order.total_price) || 0;
        d.orders += 1;
        if (order.customer?.orders_count <= 1) d.newCustomerOrders += 1;
        else d.returningCustomerOrders += 1;
        d.totalTax += parseFloat(order.total_tax) || 0;
        d.totalDiscounts += parseFloat(order.total_discounts) || 0;
        d.totalShipping += parseFloat(order.total_shipping_price_set?.shop_money?.amount || 0);
        if (order.line_items) for (const li of order.line_items) d.itemsSold += li.quantity || 0;
      }

      // Merge: overwrite matching dates, keep older data
      const dateMap = {};
      for (const d of existing) dateMap[d.date] = d;
      for (const [date, d] of Object.entries(newDays)) {
        dateMap[date] = { ...d, revenue: Math.round(d.revenue * 100) / 100, aov: d.orders > 0 ? Math.round((d.revenue / d.orders) * 100) / 100 : 0 };
      }

      const merged = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
      await kv.set(`shopify:${shop}:daily_data`, JSON.stringify(merged));
      await kv.set(`shopify:${shop}:last_pull`, { timestamp: new Date().toISOString(), orders: orders.length });
      results.shopify = { orders: orders.length, daysUpdated: Object.keys(newDays).length };
    }
  } catch (err) {
    results.errors.push({ source: 'shopify', error: err.message });
  }

  // Pull Meta
  try {
    const metaToken = process.env.META_ACCESS_TOKEN;
    const metaAccount = process.env.META_AD_ACCOUNT_ID;
    if (metaToken && metaAccount) {
      const metaInsights = await pullMeta(metaToken, metaAccount);
      const existingMetaRaw = await kv.get('meta:daily_data');
      const existingMeta = existingMetaRaw ? JSON.parse(existingMetaRaw) : [];

      const metaMap = {};
      for (const d of existingMeta) metaMap[d.date] = d;
      for (const day of metaInsights) {
        const purchases = (day.actions || []).find(a => a.action_type === 'purchase');
        const purchaseValue = (day.action_values || []).find(a => a.action_type === 'purchase');
        metaMap[day.date_start] = {
          date: day.date_start,
          metaSpend: parseFloat(day.spend) || 0,
          impressions: parseInt(day.impressions) || 0,
          clicks: parseInt(day.clicks) || 0,
          purchases: parseInt(purchases?.value) || 0,
          purchaseValue: parseFloat(purchaseValue?.value) || 0,
        };
      }

      const mergedMeta = Object.values(metaMap).sort((a, b) => a.date.localeCompare(b.date));
      await kv.set('meta:daily_data', JSON.stringify(mergedMeta));
      results.meta = { daysUpdated: metaInsights.length };
    }
  } catch (err) {
    results.errors.push({ source: 'meta', error: err.message });
  }

  res.status(200).json({ success: true, pulledAt: new Date().toISOString(), results });
}
