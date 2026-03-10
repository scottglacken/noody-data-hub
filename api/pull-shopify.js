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

  // Microsoft Clarity mode — no Shopify needed
  if (req.query.type === 'clarity') {
    var clarityToken = process.env.CLARITY_API_TOKEN;
    var clarityProject = process.env.CLARITY_PROJECT_ID;
    if (!clarityToken || !clarityProject) {
      return res.status(200).json({
        error: 'missing_config',
        message: 'Clarity not configured. Set CLARITY_API_TOKEN and CLARITY_PROJECT_ID env vars.',
        setup: 'Get your API token from clarity.microsoft.com → Settings → API Access'
      });
    }
    var cDays = parseInt(req.query.days) || 30;
    var cEnd = new Date().toISOString().split('T')[0];
    var cStart = new Date(Date.now() - cDays * 86400000).toISOString().split('T')[0];
    var cBase = 'https://www.clarity.ms/export-data/api/v1/project/' + clarityProject;
    var cHeaders = { 'Authorization': 'Bearer ' + clarityToken, 'Content-Type': 'application/json' };
    try {
      var cResults = await Promise.all([
        fetch(cBase + '/metrics?startDate=' + cStart + '&endDate=' + cEnd, { headers: cHeaders }),
        fetch(cBase + '/popular-pages?startDate=' + cStart + '&endDate=' + cEnd + '&count=10', { headers: cHeaders })
      ]);
      var metricsRes = cResults[0];
      var pagesRes = cResults[1];
      if (!metricsRes.ok) {
        var mErr = await metricsRes.text();
        return res.status(200).json({ error: 'clarity_api_error', message: 'Clarity metrics API returned ' + metricsRes.status, detail: mErr.slice(0, 300) });
      }
      var metricsData = await metricsRes.json();
      var pagesData = pagesRes.ok ? await pagesRes.json() : [];
      var popularPages = [];
      if (Array.isArray(pagesData)) {
        for (var pi = 0; pi < pagesData.length; pi++) {
          var pg = pagesData[pi];
          popularPages.push({
            url: pg.url || pg.page || '',
            sessions: pg.sessions || pg.totalSessions || 0,
            avgScrollDepth: pg.scrollDepth || pg.avgScrollDepth || 0,
            avgEngagementTime: pg.engagementTime || pg.avgEngagementTime || 0,
            rageClicks: pg.rageClickRate || pg.rageClicks || 0
          });
        }
      }
      return res.status(200).json({
        projectId: clarityProject,
        pulledAt: new Date().toISOString(),
        dateRange: { start: cStart, end: cEnd },
        metrics: {
          totalSessions: metricsData.totalSessions || 0,
          distinctUsers: metricsData.distinctUsers || 0,
          pagesPerSession: Math.round((metricsData.pagesPerSession || 0) * 100) / 100,
          avgScrollDepth: Math.round((metricsData.scrollDepth || 0) * 100) / 100,
          avgEngagementTime: Math.round((metricsData.engagementTime || 0) * 100) / 100,
          deadClickRate: Math.round((metricsData.deadClickRate || 0) * 100) / 100,
          rageClickRate: Math.round((metricsData.rageClickRate || 0) * 100) / 100,
          quickbackRate: Math.round((metricsData.quickbackRate || 0) * 100) / 100,
          excessiveScrollRate: Math.round((metricsData.excessiveScrollRate || 0) * 100) / 100
        },
        popularPages: popularPages
      });
    } catch (cErr) {
      return res.status(500).json({ error: 'clarity_fetch_failed', message: cErr.message });
    }
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
    var url = 'https://' + shop + '/admin/api/' + API_VERSION + '/orders.json?status=any&limit=250&created_at_min=' + sinceDate + 'T00:00:00Z&fields=id,name,created_at,total_price,total_tax,total_discounts,total_shipping_price_set,financial_status,line_items,customer,cancelled_at';

    while (url) {
      var response = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': token },
      });
      if (!response.ok) {
        var errText = await response.text();
        throw new Error('Shopify API ' + response.status + ': ' + errText.slice(0, 200));
      }
      var data = await response.json();
      allOrders = allOrders.concat(data.orders || []);

      var link = response.headers.get('link');
      var match = link ? link.match(/<([^>]+)>;\s*rel="next"/) : null;
      url = match ? match[1] : null;
    }

    // Filter cancelled/voided
    var validOrders = allOrders.filter(function(o) {
      return !(o.cancelled_at && o.financial_status === 'voided');
    });

    // Website analytics mode
    if (req.query.type === 'website') {
      var wTotalRev = 0, wTotalOrders = validOrders.length, wTotalItems = 0;
      var wNewOrders = 0, wNewRev = 0, wRetOrders = 0, wRetRev = 0;
      var wDiscountedOrders = 0, wTotalDiscountAmt = 0, wRefundedOrders = 0;
      var productMap = {};
      var wDayMap = {};

      for (var wi = 0; wi < validOrders.length; wi++) {
        var wo = validOrders[wi];
        var woPrice = parseFloat(wo.total_price) || 0;
        var woDisc = parseFloat(wo.total_discounts) || 0;
        var woIsNew = wo.customer && wo.customer.orders_count <= 1;

        wTotalRev += woPrice;

        // new vs returning
        if (woIsNew) { wNewOrders += 1; wNewRev += woPrice; }
        else { wRetOrders += 1; wRetRev += woPrice; }

        // discounts
        if (woDisc > 0) { wDiscountedOrders += 1; wTotalDiscountAmt += woDisc; }

        // refunds
        if (wo.financial_status === 'refunded' || wo.financial_status === 'partially_refunded') {
          wRefundedOrders += 1;
        }

        // line items — products + item count
        if (wo.line_items) {
          for (var wj = 0; wj < wo.line_items.length; wj++) {
            var li = wo.line_items[wj];
            var qty = li.quantity || 0;
            wTotalItems += qty;
            var pName = li.title || 'Unknown';
            var pRev = parseFloat(li.price) * qty;
            if (!productMap[pName]) {
              productMap[pName] = { name: pName, revenue: 0, units: 0, orderIds: {} };
            }
            productMap[pName].revenue += pRev;
            productMap[pName].units += qty;
            productMap[pName].orderIds[wo.id] = true;
          }
        }

        // daily bucketing
        var wCreated = new Date(wo.created_at);
        var wNzDate = new Date(wCreated.getTime() + 13 * 3600000);
        var wDateStr = wNzDate.toISOString().split('T')[0];
        if (!wDayMap[wDateStr]) {
          wDayMap[wDateStr] = { date: wDateStr, revenue: 0, orders: 0, newCustomers: 0, returningCustomers: 0, itemsSold: 0, discountedOrders: 0 };
        }
        var wd = wDayMap[wDateStr];
        wd.revenue += woPrice;
        wd.orders += 1;
        if (woIsNew) wd.newCustomers += 1; else wd.returningCustomers += 1;
        if (woDisc > 0) wd.discountedOrders += 1;
        if (wo.line_items) {
          for (var wk = 0; wk < wo.line_items.length; wk++) {
            wd.itemsSold += wo.line_items[wk].quantity || 0;
          }
        }
      }

      // Top 10 products by revenue
      var prodList = Object.values(productMap);
      prodList.sort(function(a, b) { return b.revenue - a.revenue; });
      var topProducts = [];
      for (var tp = 0; tp < Math.min(10, prodList.length); tp++) {
        var p = prodList[tp];
        var pOrders = Object.keys(p.orderIds).length;
        topProducts.push({
          name: p.name,
          revenue: Math.round(p.revenue * 100) / 100,
          units: p.units,
          orders: pOrders,
          aov: pOrders > 0 ? Math.round((p.revenue / pOrders) * 100) / 100 : 0
        });
      }

      // Format daily
      var wDaily = Object.values(wDayMap).map(function(dd) {
        return {
          date: dd.date,
          revenue: Math.round(dd.revenue * 100) / 100,
          orders: dd.orders,
          newCustomers: dd.newCustomers,
          returningCustomers: dd.returningCustomers,
          itemsSold: dd.itemsSold,
          discountedOrders: dd.discountedOrders
        };
      }).sort(function(a, b) { return a.date.localeCompare(b.date); });

      return res.status(200).json({
        shop: shop,
        pulledAt: new Date().toISOString(),
        dateRange: { start: sinceDate, end: new Date().toISOString().split('T')[0] },
        summary: {
          totalRevenue: Math.round(wTotalRev * 100) / 100,
          totalOrders: wTotalOrders,
          aov: wTotalOrders > 0 ? Math.round((wTotalRev / wTotalOrders) * 100) / 100 : 0,
          avgItemsPerOrder: wTotalOrders > 0 ? Math.round((wTotalItems / wTotalOrders) * 100) / 100 : 0,
          newCustomerOrders: wNewOrders,
          returningCustomerOrders: wRetOrders,
          newCustomerPct: wTotalOrders > 0 ? Math.round((wNewOrders / wTotalOrders) * 10000) / 100 : 0,
          discountedOrders: wDiscountedOrders,
          discountRate: wTotalOrders > 0 ? Math.round((wDiscountedOrders / wTotalOrders) * 10000) / 100 : 0,
          avgDiscountAmount: wDiscountedOrders > 0 ? Math.round((wTotalDiscountAmt / wDiscountedOrders) * 100) / 100 : 0,
          refundedOrders: wRefundedOrders,
          refundRate: wTotalOrders > 0 ? Math.round((wRefundedOrders / wTotalOrders) * 10000) / 100 : 0
        },
        topProducts: topProducts,
        customerBreakdown: {
          new: { orders: wNewOrders, revenue: Math.round(wNewRev * 100) / 100, aov: wNewOrders > 0 ? Math.round((wNewRev / wNewOrders) * 100) / 100 : 0 },
          returning: { orders: wRetOrders, revenue: Math.round(wRetRev * 100) / 100, aov: wRetOrders > 0 ? Math.round((wRetRev / wRetOrders) * 100) / 100 : 0 }
        },
        daily: wDaily
      });
    }

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
