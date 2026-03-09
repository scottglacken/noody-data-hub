export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  var token = process.env.META_ACCESS_TOKEN;
  var accountId = process.env.META_AD_ACCOUNT_ID;
  var days = parseInt(req.query.days) || 30;
  var level = req.query.level || 'account';

  if (!token || !accountId) {
    return res.status(400).json({ error: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID' });
  }

  var sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  var untilDate = new Date().toISOString().split('T')[0];

  try {
    // ── Campaign-level pull ──────────────────────
    if (level === 'campaign') {
      var allCampaigns = [];
      var url = 'https://graph.facebook.com/v19.0/act_' + accountId + '/insights?' +
        'fields=campaign_name,campaign_id,spend,impressions,clicks,reach,frequency,actions,action_values,cpc,cpm,ctr' +
        '&time_range={"since":"' + sinceDate + '","until":"' + untilDate + '"}' +
        '&level=campaign&limit=500&access_token=' + token;

      while (url) {
        var response = await fetch(url);
        var data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error.message, type: data.error.type });

        var page = (data.data || []).map(function(row) {
          var purchases = (row.actions || []).find(function(a) { return a.action_type === 'purchase'; });
          var purchaseValue = (row.action_values || []).find(function(a) { return a.action_type === 'purchase'; });
          var pCount = parseInt(purchases ? purchases.value : 0);
          var pValue = parseFloat(purchaseValue ? purchaseValue.value : 0);
          var sp = parseFloat(row.spend) || 0;
          return {
            campaign_name: row.campaign_name,
            campaign_id: row.campaign_id,
            spend: Math.round(sp * 100) / 100,
            impressions: parseInt(row.impressions) || 0,
            clicks: parseInt(row.clicks) || 0,
            reach: parseInt(row.reach) || 0,
            frequency: parseFloat(row.frequency) || 0,
            purchases: pCount,
            purchase_value: Math.round(pValue * 100) / 100,
            cpa: pCount > 0 ? Math.round((sp / pCount) * 100) / 100 : null,
            roas: sp > 0 ? Math.round((pValue / sp) * 100) / 100 : 0,
            cpc: parseFloat(row.cpc) || 0,
            cpm: parseFloat(row.cpm) || 0,
            ctr: parseFloat(row.ctr) || 0,
          };
        });
        allCampaigns = allCampaigns.concat(page);
        url = (data.paging && data.paging.next) ? data.paging.next : null;
      }

      var totalSpend = allCampaigns.reduce(function(s, c) { return s + c.spend; }, 0);
      var totalPurchases = allCampaigns.reduce(function(s, c) { return s + c.purchases; }, 0);
      var totalPurchaseValue = allCampaigns.reduce(function(s, c) { return s + c.purchase_value; }, 0);

      return res.status(200).json({
        accountId: accountId,
        pulledAt: new Date().toISOString(),
        dateRange: { start: sinceDate, end: untilDate },
        campaigns: allCampaigns,
        summary: {
          totalSpend: Math.round(totalSpend * 100) / 100,
          totalPurchases: totalPurchases,
          totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
          avgCPP: totalPurchases > 0 ? Math.round((totalSpend / totalPurchases) * 100) / 100 : null,
          roas: totalSpend > 0 ? Math.round((totalPurchaseValue / totalSpend) * 100) / 100 : 0,
        },
      });
    }

    // ── Account-level daily pull (original) ──────
    var allDaily = [];
    var url = 'https://graph.facebook.com/v19.0/act_' + accountId + '/insights?' +
      'fields=spend,impressions,clicks,actions,action_values,cpc,cpm,ctr' +
      '&time_range={"since":"' + sinceDate + '","until":"' + untilDate + '"}' +
      '&time_increment=1&level=account&limit=500&access_token=' + token;

    while (url) {
      var response = await fetch(url);
      var data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message, type: data.error.type });

      var page = (data.data || []).map(function(day) {
        var purchases = (day.actions || []).find(function(a) { return a.action_type === 'purchase'; });
        var purchaseValue = (day.action_values || []).find(function(a) { return a.action_type === 'purchase'; });
        return {
          date: day.date_start,
          metaSpend: parseFloat(day.spend) || 0,
          impressions: parseInt(day.impressions) || 0,
          clicks: parseInt(day.clicks) || 0,
          purchases: parseInt(purchases ? purchases.value : 0),
          purchaseValue: parseFloat(purchaseValue ? purchaseValue.value : 0),
          cpc: parseFloat(day.cpc) || 0,
          cpm: parseFloat(day.cpm) || 0,
          ctr: parseFloat(day.ctr) || 0,
        };
      });
      allDaily = allDaily.concat(page);
      url = (data.paging && data.paging.next) ? data.paging.next : null;
    }

    var totalSpend = allDaily.reduce(function(s, d) { return s + d.metaSpend; }, 0);
    var totalPurchases = allDaily.reduce(function(s, d) { return s + d.purchases; }, 0);

    return res.status(200).json({
      accountId: accountId,
      pulledAt: new Date().toISOString(),
      dateRange: { start: sinceDate, end: untilDate },
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalDays: allDaily.length,
      totalPurchases: totalPurchases,
      avgCPP: totalPurchases > 0 ? Math.round((totalSpend / totalPurchases) * 100) / 100 : null,
      daily: allDaily,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
