export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const shop = req.query.shop || process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const days = parseInt(req.query.days) || 30;

  if (!token) {
    return res.status(400).json({ error: 'Missing SHOPIFY_ACCESS_TOKEN env var' });
  }

  const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  let allOrders = [];
  let url = '/admin/api/2024-10/orders.json?status=any&limit=250&created_at_min=' + sinceDate + 'T00:00:00Z&fields=id,created_at,total_price,total_tax,total_discounts,total_shipping_price_set,financial_status,line_items,customer,source_name,cancelled_at';

  try {
    while (url) {
      const fullUrl = 'https://' + shop + url;
      const r = await fetch(fullUrl, {
        headers: { 'X-Shopify-Access-Token': token },
      });

      if (r.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      if (!r.ok) {
        return res.status(500).json({ error: 'Shopify API ' + r.status, details: await r.text() });
      }

      const data = await r.json();
      allOrders = allOrders.concat(data.orders || []);

      const link = r.headers.get('link');
      const match = link ? link.match(/<https:\/\/[^/]+(.+?)>;\s*rel="next"/) : null;
      url = match ? match[1] : null;

      if (allOrders.length > 12500) break;
    }

    const dailyMap = {};
    for (const order of allOrders) {
      if (order.cancelled_at && order.financial_status === 'voided') continue;
      const date = order.created_at.split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { date: date, revenue: 0, orders: 0, newCustomerOrders: 0, returningCustomerOrders: 0, itemsSold: 0, totalTax: 0, totalDiscounts: 0, totalShipping: 0 };
      }
      const d = dailyMap[date];
      d.revenue += parseFloat(order.total_price) || 0;
      d.orders += 1;
      d.totalTax += parseFloat(order.total_tax) || 0;
      d.totalDiscounts += parseFloat(order.total_discounts) || 0;
      d.totalShipping += parseFloat(order.total_shipping_price_set?.shop_money?.amount || 0);
      if (order.customer) {
        if (order.customer.orders_count <= 1) d.newCustomerOrders += 1;
        else d.returningCustomerOrders += 1;
      }
      if (order.line_items) {
        for (const li of order.line_items) d.itemsSold += li.quantity || 0;
      }
    }

    const daily = Object.values(dailyMap).map(function(d) {
      return {
        date: d.date,
        revenue: Math.round(d.revenue * 100) / 100,
        orders: d.orders,
        newCustomerOrders: d.newCustomerOrders,
        returningCustomerOrders: d.returningCustomerOrders,
        itemsSold: d.itemsSold,
        aov: d.orders > 0 ? Math.round((d.revenue / d.orders) * 100) / 100 : 0,
        newCustomerPct: d.orders > 0 ? Math.round((d.newCustomerOrders / d.orders) * 1000) / 10 : 0,
        totalTax: Math.round(d.totalTax * 100) / 100,
        totalDiscounts: Math.round(d.totalDiscounts * 100) / 100,
        totalShipping: Math.round(d.totalShipping * 100) / 100,
      };
    }).sort(function(a, b) { return a.date.localeCompare(b.date); });

    const totalRev = daily.reduce(function(s, d) { return s + d.revenue; }, 0);

    return res.status(200).json({
      shop: shop,
      pulledAt: new Date().toISOString(),
      totalOrders: allOrders.length,
      totalDays: daily.length,
      totalRevenue: Math.round(totalRev * 100) / 100,
      daily: daily,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
