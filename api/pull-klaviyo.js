// /api/pull-klaviyo.js — Pull email revenue attribution + detail from Klaviyo
// Returns daily email-attributed revenue from flows + campaigns
// Add ?detail=true to also get flows, campaigns, lists, deliverability

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

  var days = Math.min(parseInt(req.query.days) || 30, 364);
  var wantDetail = req.query.detail === 'true';
  var sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  var untilDate = new Date().toISOString().split('T')[0];

  var headers = {
    'Authorization': 'Klaviyo-API-Key ' + klaviyoKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'revision': '2024-10-15',
  };

  // Helper: paginate a GET endpoint
  async function fetchAll(url, limit) {
    var all = [];
    while (url) {
      var r = await fetch(url, { headers: headers });
      if (!r.ok) break;
      var page = await r.json();
      all = all.concat(page.data || []);
      url = page.links && page.links.next ? page.links.next : null;
      if (limit && all.length >= limit) break;
    }
    return limit ? all.slice(0, limit) : all;
  }

  // Helper: query metric aggregate totals
  async function queryAggregate(mId, byDims, extraFilter) {
    var filters = [
      'greater-or-equal(datetime,' + sinceDate + 'T00:00:00Z)',
      'less-than(datetime,' + untilDate + 'T23:59:59Z)',
    ];
    if (extraFilter) filters = filters.concat(extraFilter);
    var body = {
      data: {
        type: 'metric-aggregate',
        attributes: {
          metric_id: mId,
          measurements: ['sum_value', 'count', 'unique'],
          filter: filters,
          timezone: 'Pacific/Auckland',
        },
      },
    };
    if (byDims) body.data.attributes.by = byDims;
    var r = await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
      method: 'POST', headers: headers, body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    var d = await r.json();
    return d.data && d.data.attributes || null;
  }

  // Helper: sum an array
  function arrSum(arr) { return (arr || []).reduce(function(a, b) { return a + b; }, 0); }

  try {
    // --- Fetch all metrics ---
    var allMetrics = await fetchAll('https://a.klaviyo.com/api/metrics/');
    var placedOrderMetric = allMetrics.find(function(m) {
      return m.attributes && m.attributes.name === 'Placed Order';
    });

    if (!placedOrderMetric) {
      return res.status(200).json({
        success: true,
        warning: 'No "Placed Order" metric found in Klaviyo',
        daily: [],
        summary: { totalRevenue: 0, totalOrders: 0 },
      });
    }

    var metricId = placedOrderMetric.id;

    // --- Query daily revenue aggregates by channel ---
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
          by: ['$attributed_channel'],
          timezone: 'Pacific/Auckland',
        },
      },
    };

    var aggRes = await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
      method: 'POST', headers: headers, body: JSON.stringify(aggBody),
    });

    var daily = [];
    var totalRev = 0;
    var totalOrd = 0;

    if (!aggRes.ok) {
      var aggErr = await aggRes.text();
      if (aggRes.status === 403 || aggRes.status === 400) {
        // Fallback: no channel breakdown
        var attrs = await queryAggregate(metricId, null);
        if (attrs && attrs.data && attrs.data.length) {
          var dates = attrs.dates || [];
          var res0 = attrs.data[0];
          for (var i = 0; i < dates.length; i++) {
            var rev = res0.measurements && res0.measurements.sum_value ? res0.measurements.sum_value[i] || 0 : 0;
            var cnt = res0.measurements && res0.measurements.count ? res0.measurements.count[i] || 0 : 0;
            daily.push({ date: dates[i].split('T')[0], emailRevenue: Math.round(rev * 100) / 100, emailOrders: cnt });
          }
        }
        totalRev = daily.reduce(function(s, d) { return s + d.emailRevenue; }, 0);
        totalOrd = daily.reduce(function(s, d) { return s + d.emailOrders; }, 0);
      } else {
        throw new Error('Klaviyo aggregates failed: ' + aggRes.status + ' ' + aggErr.slice(0, 300));
      }
    } else {
      var aggData = await aggRes.json();
      var results = aggData.data && aggData.data.attributes && aggData.data.attributes.data;
      var dates = aggData.data && aggData.data.attributes && aggData.data.attributes.dates || [];

      var dayMap = {};
      for (var di = 0; di < dates.length; di++) {
        dayMap[dates[di].split('T')[0]] = { date: dates[di].split('T')[0], emailRevenue: 0, emailOrders: 0 };
      }

      if (results) {
        for (var r = 0; r < results.length; r++) {
          var group = results[r];
          var channel = group.dimensions && group.dimensions[0] || 'unknown';
          var isEmail = channel.indexOf('email') !== -1;
          for (var di2 = 0; di2 < dates.length; di2++) {
            var dateKey = dates[di2].split('T')[0];
            if (!dayMap[dateKey]) continue;
            var rev2 = group.measurements && group.measurements.sum_value ? group.measurements.sum_value[di2] || 0 : 0;
            var cnt2 = group.measurements && group.measurements.count ? group.measurements.count[di2] || 0 : 0;
            if (isEmail) {
              dayMap[dateKey].emailRevenue += rev2;
              dayMap[dateKey].emailOrders += cnt2;
            }
          }
        }
      }

      daily = Object.values(dayMap).sort(function(a, b) { return a.date.localeCompare(b.date); });
      daily = daily.map(function(d) {
        return { date: d.date, emailRevenue: Math.round(d.emailRevenue * 100) / 100, emailOrders: d.emailOrders };
      });

      totalRev = daily.reduce(function(s, d) { return s + d.emailRevenue; }, 0);
      totalOrd = daily.reduce(function(s, d) { return s + d.emailOrders; }, 0);
    }

    // --- Base response ---
    var response = {
      success: true,
      source: 'klaviyo',
      dateRange: { start: sinceDate, end: untilDate },
      totalRevenue: Math.round(totalRev * 100) / 100,
      totalOrders: totalOrd,
      totalDays: daily.length,
      daily: daily,
      pulledAt: new Date().toISOString(),
    };

    // --- detail=true: flows, campaigns, lists, deliverability ---
    if (wantDetail) {
      var detail = {};

      // 1) Flow performance via Klaviyo reporting API + flow list for names
      try {
        // Fetch flow list for name/status lookup
        var rawFlows = await fetchAll('https://a.klaviyo.com/api/flows/');
        var flowNameMap = {};
        rawFlows.forEach(function(f) { flowNameMap[f.id] = f.attributes; });

        var flowReportBody = {
          data: {
            type: 'flow-values-report',
            attributes: {
              statistics: ['conversion_value', 'conversions', 'revenue_per_recipient'],
              timeframe: { start: sinceDate + 'T00:00:00Z', end: untilDate + 'T23:59:59Z' },
              conversion_metric_id: metricId,
            },
          },
        };
        var flowReportRes = await fetch('https://a.klaviyo.com/api/flow-values-reports/', {
          method: 'POST', headers: headers, body: JSON.stringify(flowReportBody),
        });
        if (flowReportRes.ok) {
          var flowReportData = await flowReportRes.json();
          var flowResults = flowReportData.data && flowReportData.data.attributes && flowReportData.data.attributes.results || [];
          var totalFlowRev = 0;
          // Aggregate per-message results by flow_id
          var flowAggMap = {};
          for (var fi = 0; fi < flowResults.length; fi++) {
            var fr = flowResults[fi];
            var stats = fr.statistics || {};
            var rev = stats.conversion_value || 0;
            var conv = stats.conversions || 0;
            var fId = fr.groupings && fr.groupings.flow_id || '';
            if (!flowAggMap[fId]) {
              var flowInfo = flowNameMap[fId];
              flowAggMap[fId] = {
                id: fId,
                name: flowInfo ? flowInfo.name : (fId || 'Unknown'),
                status: flowInfo ? flowInfo.status : 'unknown',
                revenue: 0, conversions: 0, messages: 0,
              };
            }
            flowAggMap[fId].revenue += rev;
            flowAggMap[fId].conversions += conv;
            flowAggMap[fId].messages++;
            totalFlowRev += rev;
          }
          detail.flows = Object.values(flowAggMap).map(function(f) {
            f.revenue = Math.round(f.revenue * 100) / 100;
            return f;
          });
          // Add flows not in report
          var reportedFlowIds = {};
          detail.flows.forEach(function(f) { reportedFlowIds[f.id] = true; });
          rawFlows.forEach(function(f) {
            if (!reportedFlowIds[f.id]) {
              detail.flows.push({
                id: f.id, name: f.attributes.name || 'Unnamed',
                status: f.attributes.status || 'unknown',
                revenue: 0, conversions: 0, messages: 0,
              });
            }
          });
          detail.flows.sort(function(a, b) { return b.revenue - a.revenue; });
          detail.totalFlowRevenue = Math.round(totalFlowRev * 100) / 100;
        } else {
          var flowReportErr = await flowReportRes.text();
          detail.flowError = 'Flow report ' + flowReportRes.status + ': ' + flowReportErr.slice(0, 200);
          detail.flows = [];
        }
      } catch (e) { detail.flowError = e.message; detail.flows = []; }

      // 2) Campaign performance via Klaviyo reporting API + campaign list for names
      try {
        // Fetch campaign list for name/status/sendTime lookup
        var rawCampaigns = await fetchAll(
          'https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,%27email%27)&sort=-updated_at', 50
        );
        var campNameMap = {};
        rawCampaigns.forEach(function(c) { campNameMap[c.id] = c.attributes; });

        var campReportBody = {
          data: {
            type: 'campaign-values-report',
            attributes: {
              statistics: ['conversion_value', 'conversions', 'revenue_per_recipient'],
              timeframe: { start: sinceDate + 'T00:00:00Z', end: untilDate + 'T23:59:59Z' },
              conversion_metric_id: metricId,
            },
          },
        };
        var campReportRes = await fetch('https://a.klaviyo.com/api/campaign-values-reports/', {
          method: 'POST', headers: headers, body: JSON.stringify(campReportBody),
        });
        if (campReportRes.ok) {
          var campReportData = await campReportRes.json();
          var campResults = campReportData.data && campReportData.data.attributes && campReportData.data.attributes.results || [];
          var totalCampRev = 0;
          detail.campaigns = campResults.map(function(cr) {
            var stats = cr.statistics || {};
            var rev = stats.conversion_value || 0;
            var conv = stats.conversions || 0;
            var cId = cr.groupings && cr.groupings.campaign_id || '';
            var campInfo = campNameMap[cId];
            totalCampRev += rev;
            return {
              id: cId,
              name: campInfo ? campInfo.name : (cId || 'Unknown'),
              status: campInfo ? campInfo.status : 'unknown',
              sendTime: campInfo ? (campInfo.send_time || campInfo.scheduled_at) : null,
              revenue: Math.round(rev * 100) / 100,
              conversions: conv,
              recipients: 0,
              revenuePerRecipient: stats.revenue_per_recipient ? Math.round(stats.revenue_per_recipient * 100) / 100 : 0,
            };
          });
          detail.campaigns.sort(function(a, b) { return b.revenue - a.revenue; });
          detail.totalCampaignRevenue = Math.round(totalCampRev * 100) / 100;
        } else {
          var campReportErr = await campReportRes.text();
          detail.campaignError = 'Campaign report ' + campReportRes.status + ': ' + campReportErr.slice(0, 200);
          detail.campaigns = [];
        }
      } catch (e) { detail.campaignError = e.message; detail.campaigns = []; }

      // 3) Deliverability + form metrics
      try {
        var delivMetrics = {};
        var metricNames = ['Received Email', 'Opened Email', 'Clicked Email', 'Bounced Email',
          'Unsubscribed from Email Marketing', 'Unsubscribed from List', 'Marked Email as Spam',
          'Dropped Email', 'Subscribed to Email Marketing', 'Viewed Form', 'Submitted Form',
          'Active on Site'];
        for (var mn = 0; mn < metricNames.length; mn++) {
          var metricObj = allMetrics.find(function(m) { return m.attributes && m.attributes.name === metricNames[mn]; });
          if (!metricObj) continue;
          var dAgg = await queryAggregate(metricObj.id, null);
          if (dAgg && dAgg.data) {
            var total = 0;
            for (var dk = 0; dk < dAgg.data.length; dk++) {
              total += arrSum(dAgg.data[dk].measurements && dAgg.data[dk].measurements.count);
            }
            delivMetrics[metricNames[mn]] = total;
          }
        }

        var received = delivMetrics['Received Email'] || 0;
        var unsubTotal = (delivMetrics['Unsubscribed from Email Marketing'] || 0) + (delivMetrics['Unsubscribed from List'] || 0);
        detail.deliverability = {
          received: received,
          opened: delivMetrics['Opened Email'] || 0,
          clicked: delivMetrics['Clicked Email'] || 0,
          bounced: delivMetrics['Bounced Email'] || 0,
          dropped: delivMetrics['Dropped Email'] || 0,
          unsubscribed: unsubTotal,
          spamComplaints: delivMetrics['Marked Email as Spam'] || 0,
          subscribed: delivMetrics['Subscribed to Email Marketing'] || 0,
          formViews: delivMetrics['Viewed Form'] || 0,
          formSubmissions: delivMetrics['Submitted Form'] || 0,
          formConvRate: (delivMetrics['Viewed Form'] || 0) > 0 ? Math.round((delivMetrics['Submitted Form'] || 0) / delivMetrics['Viewed Form'] * 10000) / 100 : 0,
          activeOnSite: delivMetrics['Active on Site'] || 0,
          openRate: received > 0 ? Math.round((delivMetrics['Opened Email'] || 0) / received * 10000) / 100 : 0,
          clickRate: received > 0 ? Math.round((delivMetrics['Clicked Email'] || 0) / received * 10000) / 100 : 0,
          bounceRate: received > 0 ? Math.round((delivMetrics['Bounced Email'] || 0) / received * 10000) / 100 : 0,
          unsubRate: received > 0 ? Math.round(unsubTotal / received * 10000) / 100 : 0,
          spamRate: received > 0 ? Math.round((delivMetrics['Marked Email as Spam'] || 0) / received * 10000) / 100 : 0,
        };
        // Include available metric names for debugging
        detail.availableMetrics = allMetrics.map(function(m) { return m.attributes.name; });
      } catch (e) { detail.deliverabilityError = e.message; }

      response.detail = detail;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
