import { Redis } from '@upstash/redis'; const kv = Redis.fromEnv();

const API_VERSION = '2024-10';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  var shop = req.query.shop || process.env.SHOPIFY_STORE;
  var days = parseInt(req.query.days) || 30;

  if (!shop) {
    return res.status(400).json({ error: 'Missing shop or SHOPIFY_STORE env var' });
  }

  // Get token from KV (OAuth) or env
  var token = null;
  try {
    token = await kv.get('shopify:' + shop + ':token');
  } catch (e) { /* fall through */ }
  if (!token) token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!token) {
    return res.status(400).json({ error: 'No Shopify access token. Run /api/install?shop=' + shop });
  }

  var sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  try {
    var allOrders = [];
    var path = '/orders.json?status=any&limit=250&created_at_min=' + sinceDate + 'T00:00:00Z&fields=id,name,created_at,total_price,total_tax,total_discounts,total_shipping_price_set,financial_status,line_items,customer,cancelled_at';

    while (path) {
      var response = await fetch('https://' + shop + '/admin/api/' + API_VERSION + path, {
        headers: { 'X-Shopify-Access-Token': token },
      });
      if (!response.ok) {
        var errText = await response.text();
        throw new Error('Shopify API ' + response.status + ': ' + errText.slice(0, 200));
      }
      var data = await response.json();
      allOrders = allOrders.concat(data.orders || []);

      var link = response.headers.get('link');
      var match = link ? link.match(/<https:\/\/[^/]+(.+?)>;\s*rel="next"/) : null;
      path = match ? match[1] : null;
    }

    // Filter cancelled/voided
    var validOrders = allOrders.filter(function(o) {
      return !(o.cancelled_at && o.financial_status === 'voided');
    });

    // Bucket into daily (NZST)
    var dayMap = {};
    for (var i = 0; i < validOrders.length; i++) {
      var order = validOrders[i];
      var created = new Date(order.created_at);
      var nzDate = new Date(created.getTime() + 13 * 3600000);
      var date = nzDate.toISOString().split('T')[0];

      if (!dayMap[date]) {
        dayMap[date] = { date: date, revenue: 0, orders: 0, itemsSold: 0, totalShipping: 0, totalTax: 0, totalDiscounts: 0, newCustomers: 0, returningCustomers: 0 };
      }
      var d = dayMap[date];
      d.revenue += parseFloat(order.total_price) || 0;
      d.orders += 1;
      d.totalTax += parseFloat(order.total_tax) || 0;
      d.totalDiscounts += parseFloat(order.total_discounts) || 0;
      var shipAmt = order.total_shipping_price_set && order.total_shipping_price_set.shop_money ? order.total_shipping_price_set.shop_money.amount : 0;
      d.totalShipping += parseFloat(shipAmt);
      if (order.customer && order.customer.orders_count <= 1) d.newCustomers += 1;
      else d.returningCustomers += 1;
      if (order.line_items) {
        for (var j = 0; j < order.line_items.length; j++) {
          d.itemsSold += order.line_items[j].quantity || 0;
        }
      }
    }

    var daily = Object.values(dayMap).map(function(d) {
      return {
        date: d.date,
        revenue: Math.round(d.revenue * 100) / 100,
        orders: d.orders,
        itemsSold: d.itemsSold,
        totalShipping: Math.round(d.totalShipping * 100) / 100,
        totalTax: Math.round(d.totalTax * 100) / 100,
        totalDiscounts: Math.round(d.totalDiscounts * 100) / 100,
        newCustomers: d.newCustomers,
        returningCustomers: d.returningCustomers,
        aov: d.orders > 0 ? Math.round((d.revenue / d.orders) * 100) / 100 : 0,
      };
    }).sort(function(a, b) { return a.date.localeCompare(b.date); });

    var totalRevenue = daily.reduce(function(s, d) { return s + d.revenue; }, 0);
    var totalOrders = daily.reduce(function(s, d) { return s + d.orders; }, 0);

    return res.status(200).json({
      shop: shop,
      pulledAt: new Date().toISOString(),
      dateRange: { start: sinceDate, end: new Date().toISOString().split('T')[0] },
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: totalOrders,
      aov: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      totalDays: daily.length,
      daily: daily,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
