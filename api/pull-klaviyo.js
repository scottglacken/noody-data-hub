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

  try {
    // --- Fetch all metrics (needed for aggregates) ---
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
      method: 'POST',
      headers: headers,
      body: JSON.stringify(aggBody),
    });

    var daily = [];
    var totalRev = 0;
    var totalOrd = 0;

    if (!aggRes.ok) {
      var aggErr = await aggRes.text();
      if (aggRes.status === 403 || aggRes.status === 400) {
        // Fallback: query without $attributed_channel grouping
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

        if (results && results.length) {
          var dates = simpleData.data.attributes.dates || [];
          for (var i = 0; i < dates.length; i++) {
            var rev = results[0] && results[0].measurements && results[0].measurements.sum_value ? results[0].measurements.sum_value[i] || 0 : 0;
            var cnt = results[0] && results[0].measurements && results[0].measurements.count ? results[0].measurements.count[i] || 0 : 0;
            daily.push({ date: dates[i].split('T')[0], emailRevenue: Math.round(rev * 100) / 100, emailOrders: cnt });
          }
        }

        totalRev = daily.reduce(function(s, d) { return s + d.emailRevenue; }, 0);
        totalOrd = daily.reduce(function(s, d) { return s + d.emailOrders; }, 0);
      } else {
        throw new Error('Klaviyo aggregates failed: ' + aggRes.status + ' ' + aggErr.slice(0, 300));
      }
    } else {
      // Parse channel-grouped data
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

    // --- Base response (always returned) ---
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

    // --- If detail=true, fetch flows, campaigns, lists ---
    if (wantDetail) {
      var detail = { flows: [], campaigns: [], lists: [], metrics: [] };

      // 1) Flows
      try {
        var allFlows = [];
        var flowUrl = 'https://a.klaviyo.com/api/flows/';
        while (flowUrl) {
          var fRes = await fetch(flowUrl, { headers: headers });
          if (!fRes.ok) break;
          var fPage = await fRes.json();
          allFlows = allFlows.concat(fPage.data || []);
          flowUrl = fPage.links && fPage.links.next ? fPage.links.next : null;
        }
        detail.flows = allFlows.map(function(f) {
          return {
            id: f.id,
            name: f.attributes.name || 'Unnamed',
            status: f.attributes.status || 'unknown',
            created: f.attributes.created ? f.attributes.created.split('T')[0] : null,
            updated: f.attributes.updated ? f.attributes.updated.split('T')[0] : null,
            archived: f.attributes.archived || false,
          };
        });
      } catch (e) { detail.flowError = e.message; }

      // 2) Query per-flow revenue using metric aggregates grouped by $flow
      try {
        var flowAggBody = {
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: metricId,
              measurements: ['sum_value', 'count', 'unique'],
              filter: [
                'greater-or-equal(datetime,' + sinceDate + 'T00:00:00Z)',
                'less-than(datetime,' + untilDate + 'T23:59:59Z)',
              ],
              by: ['$flow'],
              timezone: 'Pacific/Auckland',
            },
          },
        };
        var flowAggRes = await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
          method: 'POST', headers: headers, body: JSON.stringify(flowAggBody),
        });
        if (flowAggRes.ok) {
          var flowAggData = await flowAggRes.json();
          var flowResults = flowAggData.data && flowAggData.data.attributes && flowAggData.data.attributes.data || [];
          var flowRevMap = {};
          for (var fi = 0; fi < flowResults.length; fi++) {
            var fg = flowResults[fi];
            var flowId = fg.dimensions && fg.dimensions[0] || 'unknown';
            var fRev = fg.measurements && fg.measurements.sum_value ? fg.measurements.sum_value.reduce(function(a, b) { return a + b; }, 0) : 0;
            var fCnt = fg.measurements && fg.measurements.count ? fg.measurements.count.reduce(function(a, b) { return a + b; }, 0) : 0;
            var fUniq = fg.measurements && fg.measurements.unique ? fg.measurements.unique.reduce(function(a, b) { return a + b; }, 0) : 0;
            flowRevMap[flowId] = { revenue: Math.round(fRev * 100) / 100, conversions: fCnt, recipients: fUniq };
          }
          // Merge revenue data into flow list
          for (var fj = 0; fj < detail.flows.length; fj++) {
            var fm = flowRevMap[detail.flows[fj].id];
            if (fm) {
              detail.flows[fj].revenue = fm.revenue;
              detail.flows[fj].conversions = fm.conversions;
              detail.flows[fj].recipients = fm.recipients;
              detail.flows[fj].revenuePerRecipient = fm.recipients > 0 ? Math.round(fm.revenue / fm.recipients * 100) / 100 : 0;
            } else {
              detail.flows[fj].revenue = 0;
              detail.flows[fj].conversions = 0;
              detail.flows[fj].recipients = 0;
              detail.flows[fj].revenuePerRecipient = 0;
            }
          }
          detail.totalFlowRevenue = Object.values(flowRevMap).reduce(function(s, v) { return s + v.revenue; }, 0);
        }
      } catch (e) { detail.flowAggError = e.message; }

      // 3) Campaigns
      try {
        var allCampaigns = [];
        var campUrl = 'https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,%27email%27)&sort=-updated_at';
        while (campUrl) {
          var cRes = await fetch(campUrl, { headers: headers });
          if (!cRes.ok) break;
          var cPage = await cRes.json();
          allCampaigns = allCampaigns.concat(cPage.data || []);
          campUrl = cPage.links && cPage.links.next ? cPage.links.next : null;
          // Limit to 50 most recent campaigns
          if (allCampaigns.length >= 50) break;
        }
        detail.campaigns = allCampaigns.slice(0, 50).map(function(c) {
          return {
            id: c.id,
            name: c.attributes.name || 'Unnamed',
            status: c.attributes.status || 'unknown',
            sendTime: c.attributes.send_time || c.attributes.scheduled_at || null,
            created: c.attributes.created_at ? c.attributes.created_at.split('T')[0] : null,
            updated: c.attributes.updated_at ? c.attributes.updated_at.split('T')[0] : null,
          };
        });
      } catch (e) { detail.campaignError = e.message; }

      // 4) Query per-campaign revenue
      try {
        var campAggBody = {
          data: {
            type: 'metric-aggregate',
            attributes: {
              metric_id: metricId,
              measurements: ['sum_value', 'count', 'unique'],
              filter: [
                'greater-or-equal(datetime,' + sinceDate + 'T00:00:00Z)',
                'less-than(datetime,' + untilDate + 'T23:59:59Z)',
              ],
              by: ['$message'],
              timezone: 'Pacific/Auckland',
            },
          },
        };
        var campAggRes = await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
          method: 'POST', headers: headers, body: JSON.stringify(campAggBody),
        });
        if (campAggRes.ok) {
          var campAggData = await campAggRes.json();
          var campResults = campAggData.data && campAggData.data.attributes && campAggData.data.attributes.data || [];
          var campRevMap = {};
          for (var ci = 0; ci < campResults.length; ci++) {
            var cg = campResults[ci];
            var msgId = cg.dimensions && cg.dimensions[0] || 'unknown';
            var cRev = cg.measurements && cg.measurements.sum_value ? cg.measurements.sum_value.reduce(function(a, b) { return a + b; }, 0) : 0;
            var cCnt = cg.measurements && cg.measurements.count ? cg.measurements.count.reduce(function(a, b) { return a + b; }, 0) : 0;
            var cUniq = cg.measurements && cg.measurements.unique ? cg.measurements.unique.reduce(function(a, b) { return a + b; }, 0) : 0;
            campRevMap[msgId] = { revenue: Math.round(cRev * 100) / 100, conversions: cCnt, recipients: cUniq };
          }
          // Merge into campaigns (campaign ID may differ from message ID — best-effort match)
          for (var ck = 0; ck < detail.campaigns.length; ck++) {
            var cm = campRevMap[detail.campaigns[ck].id];
            if (cm) {
              detail.campaigns[ck].revenue = cm.revenue;
              detail.campaigns[ck].conversions = cm.conversions;
              detail.campaigns[ck].recipients = cm.recipients;
            } else {
              detail.campaigns[ck].revenue = 0;
              detail.campaigns[ck].conversions = 0;
              detail.campaigns[ck].recipients = 0;
            }
          }
          detail.totalCampaignRevenue = Object.values(campRevMap).reduce(function(s, v) { return s + v.revenue; }, 0);
        }
      } catch (e) { detail.campaignAggError = e.message; }

      // 5) Lists (subscriber counts)
      try {
        var allLists = [];
        var listUrl = 'https://a.klaviyo.com/api/lists/';
        while (listUrl) {
          var lRes = await fetch(listUrl, { headers: headers });
          if (!lRes.ok) break;
          var lPage = await lRes.json();
          allLists = allLists.concat(lPage.data || []);
          listUrl = lPage.links && lPage.links.next ? lPage.links.next : null;
        }
        detail.lists = allLists.map(function(l) {
          return {
            id: l.id,
            name: l.attributes.name || 'Unnamed',
            created: l.attributes.created ? l.attributes.created.split('T')[0] : null,
            updated: l.attributes.updated ? l.attributes.updated.split('T')[0] : null,
          };
        });
      } catch (e) { detail.listError = e.message; }

      // 6) Deliverability metrics — query key email metrics (Received, Opened, Clicked, Bounced, Unsubscribed, Spam)
      try {
        var delivMetrics = {};
        var metricNames = ['Received Email', 'Opened Email', 'Clicked Email', 'Bounced Email', 'Unsubscribed', 'Marked Email as Spam'];
        for (var mi = 0; mi < metricNames.length; mi++) {
          var metricObj = allMetrics.find(function(m) { return m.attributes && m.attributes.name === metricNames[mi]; });
          if (!metricObj) continue;
          var dAggBody = {
            data: {
              type: 'metric-aggregate',
              attributes: {
                metric_id: metricObj.id,
                measurements: ['count'],
                filter: [
                  'greater-or-equal(datetime,' + sinceDate + 'T00:00:00Z)',
                  'less-than(datetime,' + untilDate + 'T23:59:59Z)',
                ],
                timezone: 'Pacific/Auckland',
              },
            },
          };
          var dRes = await fetch('https://a.klaviyo.com/api/metric-aggregates/', {
            method: 'POST', headers: headers, body: JSON.stringify(dAggBody),
          });
          if (dRes.ok) {
            var dData = await dRes.json();
            var dResults = dData.data && dData.data.attributes && dData.data.attributes.data || [];
            var totalCount = 0;
            for (var dk = 0; dk < dResults.length; dk++) {
              var dCounts = dResults[dk].measurements && dResults[dk].measurements.count || [];
              totalCount += dCounts.reduce(function(a, b) { return a + b; }, 0);
            }
            delivMetrics[metricNames[mi]] = totalCount;
          }
        }

        var received = delivMetrics['Received Email'] || 0;
        detail.deliverability = {
          received: received,
          opened: delivMetrics['Opened Email'] || 0,
          clicked: delivMetrics['Clicked Email'] || 0,
          bounced: delivMetrics['Bounced Email'] || 0,
          unsubscribed: delivMetrics['Unsubscribed'] || 0,
          spamComplaints: delivMetrics['Marked Email as Spam'] || 0,
          openRate: received > 0 ? Math.round((delivMetrics['Opened Email'] || 0) / received * 10000) / 100 : 0,
          clickRate: received > 0 ? Math.round((delivMetrics['Clicked Email'] || 0) / received * 10000) / 100 : 0,
          bounceRate: received > 0 ? Math.round((delivMetrics['Bounced Email'] || 0) / received * 10000) / 100 : 0,
          unsubRate: received > 0 ? Math.round((delivMetrics['Unsubscribed'] || 0) / received * 10000) / 100 : 0,
          spamRate: received > 0 ? Math.round((delivMetrics['Marked Email as Spam'] || 0) / received * 10000) / 100 : 0,
        };
      } catch (e) { detail.deliverabilityError = e.message; }

      response.detail = detail;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
