// /api/pull-klaviyo.js — Pull email revenue attribution from Klaviyo
// Returns daily email-attributed revenue from flows + campaigns

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  var klaviyoKey = process.env.KLAVIYO_API_KEY;
  if (!klaviyoKey) {
    return res.status(400).json({ error: 'Missing KLAVIYO_API_KEY env var' });
  }

  var days = parseInt(req.query.days) || 30;
  var sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  var untilDate = new Date().toISOString().split('T')[0];

  var headers = {
    'Authorization': 'Klaviyo-API-Key ' + klaviyoKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'revision': '2024-10-15',
  };

  try {
    // Query metric aggregates for "Placed Order" attributed to email
    // First find the "Placed Order" metric ID - list all and search
    var allMetrics = [];
    var metricsUrl = 'https://a.klaviyo.com/api/metrics/';
    while (metricsUrl) {
      var metricsRes = await fetch(metricsUrl, { headers: headers });
      if (!metricsRes.ok) {
        var errText = await metricsRes.text();
        throw new Error('Klaviyo metrics list failed: ' + metricsRes.status + ' ' + errText.slice(0, 300));
      }
      var metricsPage = await metricsRes.json();
      allMetrics = allMetrics.concat(metricsPage.data || []);
      metricsUrl = metricsPage.links && metricsPage.links.next ? metricsPage.links.next : null;
    }
    var placedOrderMetric = allMetrics.find(function(m) {
      return m.attributes && m.attributes.name === 'Placed Order';
    });

    if (!placedOrderMetric) {
      return res.status(200).json({
        success: true,
        warning: 'No "Placed Order" metric found in Klaviyo',
        daily: [],
        summary: { totalRevenue: 0, totalOrders: 0, flowRevenue: 0, campaignRevenue: 0 },
      });
    }

    var metricId = placedOrderMetric.id;

    // Query daily revenue aggregates for this metric
    // Using metric-aggregates endpoint to get daily revenue
    var aggBody = {
      data: {
        type: 'metric-aggregate',
        attributes: {
          metric_id: metricId,
          measurements: ['sum_value', 'count'],
          interval: 'day',
          filter: [
            'greater-or-equal(datetime,' + sinceDate + 'T00:00:00Z)',
            'less-than(datetime,' + untilDate + 'T23:59:59Z)',
          ],
          by: ['$attribution_channel'],
          timezone: 'Pacific/Auckland',
        },
      },
    };

    var aggRes = await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(aggBody),
    });

    if (!aggRes.ok) {
      var aggErr = await aggRes.text();
      // If metric aggregates fails (needs higher tier), fall back to simpler approach
      if (aggRes.status === 403 || aggRes.status === 400) {
        // Fallback: query without $attribution_channel grouping
        var simplebody = {
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: metricId,
              measurements: ['sum_value', 'count'],
              interval: 'day',
              filter: [
                'greater-or-equal(datetime,' + sinceDate + 'T00:00:00Z)',
                'less-than(datetime,' + untilDate + 'T23:59:59Z)',
              ],
              timezone: 'Pacific/Auckland',
            },
          },
        };

        var simpleRes = await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(simplebody),
        });

        if (!simpleRes.ok) {
          var simpleErr = await simpleRes.text();
          throw new Error('Klaviyo aggregates failed: ' + simpleRes.status + ' ' + simpleErr.slice(0, 300));
        }

        var simpleData = await simpleRes.json();
        var results = simpleData.data && simpleData.data.attributes && simpleData.data.attributes.data;

        if (!results || !results.length) {
          return res.status(200).json({
            success: true,
            note: 'No data for period',
            daily: [],
            summary: { totalRevenue: 0, totalOrders: 0 },
            pulledAt: new Date().toISOString(),
          });
        }

        // Parse simple daily data (no channel breakdown)
        var dates = simpleData.data.attributes.dates || [];
        var daily = [];
        for (var i = 0; i < dates.length; i++) {
          var rev = results[0] && results[0].measurements && results[0].measurements.sum_value ? results[0].measurements.sum_value[i] || 0 : 0;
          var cnt = results[0] && results[0].measurements && results[0].measurements.count ? results[0].measurements.count[i] || 0 : 0;
          daily.push({
            date: dates[i].split('T')[0],
            emailRevenue: Math.round(rev * 100) / 100,
            emailOrders: cnt,
          });
        }

        var totalRev = daily.reduce(function(s, d) { return s + d.emailRevenue; }, 0);
        var totalOrd = daily.reduce(function(s, d) { return s + d.emailOrders; }, 0);

        return res.status(200).json({
          success: true,
          source: 'klaviyo',
          note: 'All Placed Orders (no channel breakdown — may include non-email)',
          dateRange: { start: sinceDate, end: untilDate },
          totalRevenue: Math.round(totalRev * 100) / 100,
          totalOrders: totalOrd,
          totalDays: daily.length,
          daily: daily,
          pulledAt: new Date().toISOString(),
        });
      }

      throw new Error('Klaviyo aggregates failed: ' + aggRes.status + ' ' + aggErr.slice(0, 300));
    }

    // Parse channel-grouped data
    var aggData = await aggRes.json();
    var results = aggData.data && aggData.data.attributes && aggData.data.attributes.data;
    var dates = aggData.data && aggData.data.attributes && aggData.data.attributes.dates || [];

    // Build daily map
    var dayMap = {};
    for (var di = 0; di < dates.length; di++) {
      dayMap[dates[di].split('T')[0]] = { date: dates[di].split('T')[0], emailRevenue: 0, emailOrders: 0, flowRevenue: 0, flowOrders: 0, campaignRevenue: 0, campaignOrders: 0 };
    }

    if (results) {
      for (var r = 0; r < results.length; r++) {
        var group = results[r];
        var channel = group.dimensions && group.dimensions[0] || 'unknown';
        var isEmail = channel === 'email';
        var isFlow = channel === 'flow';
        var isCampaign = channel === 'campaign';

        for (var di2 = 0; di2 < dates.length; di2++) {
          var dateKey = dates[di2].split('T')[0];
          if (!dayMap[dateKey]) continue;
          var rev2 = group.measurements && group.measurements.sum_value ? group.measurements.sum_value[di2] || 0 : 0;
          var cnt2 = group.measurements && group.measurements.count ? group.measurements.count[di2] || 0 : 0;

          if (isEmail || isFlow || isCampaign) {
            dayMap[dateKey].emailRevenue += rev2;
            dayMap[dateKey].emailOrders += cnt2;
          }
          if (isFlow) { dayMap[dateKey].flowRevenue += rev2; dayMap[dateKey].flowOrders += cnt2; }
          if (isCampaign) { dayMap[dateKey].campaignRevenue += rev2; dayMap[dateKey].campaignOrders += cnt2; }
        }
      }
    }

    var daily = Object.values(dayMap).sort(function(a, b) { return a.date.localeCompare(b.date); });
    daily = daily.map(function(d) {
      return {
        date: d.date,
        emailRevenue: Math.round(d.emailRevenue * 100) / 100,
        emailOrders: d.emailOrders,
        flowRevenue: Math.round(d.flowRevenue * 100) / 100,
        flowOrders: d.flowOrders,
        campaignRevenue: Math.round(d.campaignRevenue * 100) / 100,
        campaignOrders: d.campaignOrders,
      };
    });

    var totalRev = daily.reduce(function(s, d) { return s + d.emailRevenue; }, 0);
    var totalOrd = daily.reduce(function(s, d) { return s + d.emailOrders; }, 0);
    var flowRev = daily.reduce(function(s, d) { return s + d.flowRevenue; }, 0);
    var campRev = daily.reduce(function(s, d) { return s + d.campaignRevenue; }, 0);

    return res.status(200).json({
      success: true,
      source: 'klaviyo',
      dateRange: { start: sinceDate, end: untilDate },
      totalRevenue: Math.round(totalRev * 100) / 100,
      totalOrders: totalOrd,
      flowRevenue: Math.round(flowRev * 100) / 100,
      campaignRevenue: Math.round(campRev * 100) / 100,
      totalDays: daily.length,
      daily: daily,
      pulledAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
