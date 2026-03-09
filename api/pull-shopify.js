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

  if (!token || !accountId) {
    return res.status(400).json({ error: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID' });
  }

  var sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  var untilDate = new Date().toISOString().split('T')[0];

  try {
    var url = 'https://graph.facebook.com/v19.0/act_' + accountId + '/insights?' +
      'fields=spend,impressions,clicks,actions,action_values,cpc,cpm,ctr' +
      '&time_range={"since":"' + sinceDate + '","until":"' + untilDate + '"}' +
      '&time_increment=1&level=account&access_token=' + token;

    var response = await fetch(url);
    var data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message, type: data.error.type });
    }

    var daily = (data.data || []).map(function(day) {
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

    var totalSpend = daily.reduce(function(s, d) { return s + d.metaSpend; }, 0);

    return res.status(200).json({
      accountId: accountId,
      pulledAt: new Date().toISOString(),
      dateRange: { start: sinceDate, end: untilDate },
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalDays: daily.length,
      daily: daily,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
