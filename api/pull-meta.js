export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    // Always fetch daily account data
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
    var totalPurchaseValue = allDaily.reduce(function(s, d) { return s + d.purchaseValue; }, 0);

    var result = {
      accountId: accountId,
      pulledAt: new Date().toISOString(),
      dateRange: sinceDate + ' to ' + untilDate,
      summary: {
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalPurchases: totalPurchases,
        totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
        avgCPP: totalPurchases > 0 ? Math.round((totalSpend / totalPurchases) * 100) / 100 : null,
        roas: totalSpend > 0 ? Math.round((totalPurchaseValue / totalSpend) * 100) / 100 : null,
      },
      totalDays: allDaily.length,
      daily: allDaily,
    };

    // If campaign level requested, also fetch campaign breakdown
    if (level === 'campaign' || level === 'all') {
      var allCampaigns = [];
      var campUrl = 'https://graph.facebook.com/v19.0/act_' + accountId + '/insights?' +
        'fields=campaign_name,campaign_id,spend,impressions,reach,clicks,frequency,actions,action_values,cpc,cpm,ctr' +
        '&time_range={"since":"' + sinceDate + '","until":"' + untilDate + '"}' +
        '&level=campaign&limit=500&access_token=' + token;

      while (campUrl) {
        var campRes = await fetch(campUrl);
        var campData = await campRes.json();
        if (campData.error) {
          result.campaignError = campData.error.message;
          break;
        }

        var campPage = (campData.data || []).map(function(c) {
          var purchases = (c.actions || []).find(function(a) { return a.action_type === 'purchase'; });
          var purchaseValue = (c.action_values || []).find(function(a) { return a.action_type === 'purchase'; });
          var addToCart = (c.actions || []).find(function(a) { return a.action_type === 'add_to_cart'; });
          var purch = parseInt(purchases ? purchases.value : 0);
          var spent = parseFloat(c.spend) || 0;
          return {
            campaignName: c.campaign_name,
            campaignId: c.campaign_id,
            spend: spent,
            impressions: parseInt(c.impressions) || 0,
            reach: parseInt(c.reach) || 0,
            clicks: parseInt(c.clicks) || 0,
            frequency: parseFloat(c.frequency) || 0,
            ctr: parseFloat(c.ctr) || 0,
            cpc: parseFloat(c.cpc) || 0,
            cpm: parseFloat(c.cpm) || 0,
            purchases: purch,
            purchaseValue: parseFloat(purchaseValue ? purchaseValue.value : 0),
            addToCart: parseInt(addToCart ? addToCart.value : 0),
            cpa: purch > 0 ? Math.round((spent / purch) * 100) / 100 : null,
            roas: spent > 0 ? Math.round((parseFloat(purchaseValue ? purchaseValue.value : 0) / spent) * 100) / 100 : null,
          };
        });
        allCampaigns = allCampaigns.concat(campPage);
        campUrl = (campData.paging && campData.paging.next) ? campData.paging.next : null;
      }

      // Sort by spend descending
      allCampaigns.sort(function(a, b) { return b.spend - a.spend; });
      result.campaigns = allCampaigns;
    }

    // Keep backward compat
    result.totalSpend = result.summary.totalSpend;
    result.totalPurchases = result.summary.totalPurchases;
    result.avgCPP = result.summary.avgCPP;

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
