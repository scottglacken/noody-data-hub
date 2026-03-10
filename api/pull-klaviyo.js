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

      // 1) Flows list + revenue via $flow grouping on Placed Order
      try {
        var rawFlows = await fetchAll('https://a.klaviyo.com/api/flows/');
        var flowNameMap = {};
        rawFlows.forEach(function(f) { flowNameMap[f.id] = f; });

        // Query Placed Order grouped by $flow — returns flow IDs as dimension values
        var flowAgg = await queryAggregate(metricId, ['$flow']);
        var flowPerf = [];
        var totalFlowRev = 0;
        if (flowAgg && flowAgg.data) {
          for (var fi = 0; fi < flowAgg.data.length; fi++) {
            var fg = flowAgg.data[fi];
            var dimVal = fg.dimensions && fg.dimensions[0] || '';
            if (!dimVal) continue; // skip empty (non-flow attributed)
            var fRev = arrSum(fg.measurements && fg.measurements.sum_value);
            var fCnt = arrSum(fg.measurements && fg.measurements.count);
            var fUniq = arrSum(fg.measurements && fg.measurements.unique);
            totalFlowRev += fRev;
            // Try to find flow name from list
            var flowInfo = flowNameMap[dimVal];
            flowPerf.push({
              id: dimVal,
              name: flowInfo ? flowInfo.attributes.name : dimVal,
              status: flowInfo ? flowInfo.attributes.status : 'unknown',
              revenue: Math.round(fRev * 100) / 100,
              conversions: fCnt,
              recipients: fUniq,
              revenuePerRecipient: fUniq > 0 ? Math.round(fRev / fUniq * 100) / 100 : 0,
            });
          }
        }
        // Add flows with no revenue from the list
        var usedIds = {};
        flowPerf.forEach(function(f) { usedIds[f.id] = true; });
        rawFlows.forEach(function(f) {
          if (!usedIds[f.id]) {
            flowPerf.push({
              id: f.id,
              name: f.attributes.name || 'Unnamed',
              status: f.attributes.status || 'unknown',
              revenue: 0, conversions: 0, recipients: 0, revenuePerRecipient: 0,
            });
          }
        });
        flowPerf.sort(function(a, b) { return b.revenue - a.revenue; });
        detail.flows = flowPerf;
        detail.totalFlowRevenue = Math.round(totalFlowRev * 100) / 100;
      } catch (e) { detail.flowError = e.message; detail.flows = []; }

      // 2) Campaigns + revenue via $message grouping
      try {
        var rawCampaigns = await fetchAll(
          'https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,%27email%27)&sort=-updated_at',
          50
        );

        // Query Placed Order grouped by $message
        var msgAgg = await queryAggregate(metricId, ['$message']);
        var msgRevMap = {};
        var totalCampRev = 0;
        if (msgAgg && msgAgg.data) {
          for (var mi2 = 0; mi2 < msgAgg.data.length; mi2++) {
            var mg = msgAgg.data[mi2];
            var msgDim = mg.dimensions && mg.dimensions[0] || '';
            if (!msgDim) continue;
            var mRev = arrSum(mg.measurements && mg.measurements.sum_value);
            var mCnt = arrSum(mg.measurements && mg.measurements.count);
            var mUniq = arrSum(mg.measurements && mg.measurements.unique);
            msgRevMap[msgDim] = { revenue: Math.round(mRev * 100) / 100, conversions: mCnt, recipients: mUniq };
          }
        }

        // Fetch campaign message IDs in parallel (only for sent campaigns, max 20)
        var sentCampaigns = rawCampaigns.filter(function(c) {
          return c.attributes.status === 'Sent' || c.attributes.status === 'sent';
        }).slice(0, 20);
        var msgLookups = await Promise.all(sentCampaigns.map(function(camp) {
          return fetch('https://a.klaviyo.com/api/campaigns/' + camp.id + '/campaign-messages/', { headers: headers })
            .then(function(r) { return r.ok ? r.json() : { data: [] }; })
            .then(function(d) { return { campId: camp.id, messages: d.data || [] }; })
            .catch(function() { return { campId: camp.id, messages: [] }; });
        }));
        // Build campaign-to-message mapping
        var campMsgMap = {};
        msgLookups.forEach(function(l) { campMsgMap[l.campId] = l.messages.map(function(m) { return m.id; }); });

        var campPerf = [];
        for (var ci = 0; ci < rawCampaigns.length; ci++) {
          var camp = rawCampaigns[ci];
          var campName = camp.attributes.name || 'Unnamed';
          var campStatus = camp.attributes.status || 'unknown';
          var sendTime = camp.attributes.send_time || camp.attributes.scheduled_at || null;

          var campRev = 0, campConv = 0, campRecip = 0;
          // Try direct ID match
          if (msgRevMap[camp.id]) {
            campRev = msgRevMap[camp.id].revenue;
            campConv = msgRevMap[camp.id].conversions;
            campRecip = msgRevMap[camp.id].recipients;
          }
          // Try message ID match
          if (campRev === 0 && campMsgMap[camp.id]) {
            campMsgMap[camp.id].forEach(function(msgId) {
              var mr = msgRevMap[msgId];
              if (mr) { campRev += mr.revenue; campConv += mr.conversions; campRecip += mr.recipients; }
            });
          }

          totalCampRev += campRev;
          campPerf.push({
            id: camp.id,
            name: campName,
            status: campStatus,
            sendTime: sendTime,
            revenue: campRev,
            conversions: campConv,
            recipients: campRecip,
          });
        }
        campPerf.sort(function(a, b) { return b.revenue - a.revenue; });
        detail.campaigns = campPerf;
        detail.totalCampaignRevenue = Math.round(totalCampRev * 100) / 100;
      } catch (e) { detail.campaignError = e.message; detail.campaigns = []; }

      // 3) Lists
      try {
        var rawLists = await fetchAll('https://a.klaviyo.com/api/lists/');
        detail.lists = rawLists.map(function(l) {
          return {
            id: l.id,
            name: l.attributes.name || 'Unnamed',
            created: l.attributes.created ? l.attributes.created.split('T')[0] : null,
            updated: l.attributes.updated ? l.attributes.updated.split('T')[0] : null,
          };
        });
        // Get total profile count via profiles endpoint (single request)
        try {
          var profUrl = 'https://a.klaviyo.com/api/profiles/?page%5Bsize%5D=1';
          var profRes = await fetch(profUrl, { headers: headers });
          if (profRes.ok) {
            var profData = await profRes.json();
            // Total count may not be available; use link presence as indicator
            detail.totalProfiles = profData.data ? profData.data.length : 0;
            if (profData.links && profData.links.next) detail.totalProfilesNote = 'paginated';
          }
        } catch (e) { /* skip */ }
      } catch (e) { detail.listError = e.message; detail.lists = []; }

      // 4) Deliverability metrics
      try {
        var delivMetrics = {};
        var metricNames = ['Received Email', 'Opened Email', 'Clicked Email', 'Bounced Email',
          'Unsubscribed', 'Unsubscribed from List', 'Marked Email as Spam',
          'Dropped Email', 'Subscribed to List'];
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
        var unsubTotal = (delivMetrics['Unsubscribed'] || 0) + (delivMetrics['Unsubscribed from List'] || 0);
        detail.deliverability = {
          received: received,
          opened: delivMetrics['Opened Email'] || 0,
          clicked: delivMetrics['Clicked Email'] || 0,
          bounced: delivMetrics['Bounced Email'] || 0,
          dropped: delivMetrics['Dropped Email'] || 0,
          unsubscribed: unsubTotal,
          spamComplaints: delivMetrics['Marked Email as Spam'] || 0,
          subscribed: delivMetrics['Subscribed to List'] || 0,
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
