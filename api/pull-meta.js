// /api/pull-meta.js — Pulls daily ad spend from Meta Marketing API
// Usage: GET /api/pull-meta?days=30
// Requires: META_ACCESS_TOKEN and META_AD_ACCOUNT_ID env vars

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const days = parseInt(req.query.days) || 30;

  if (!token || !accountId) {
    return res.status(400).json({
      error: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID',
      setup: 'Add these to your Vercel environment variables',
    });
  }

  const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const untilDate = new Date().toISOString().split('T')[0];

  try {
    // Pull daily ad spend from Meta
    const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?` +
      `fields=spend,impressions,clicks,actions,action_values,cpc,cpm,cpp,ctr,cost_per_action_type` +
      `&time_range={"since":"${sinceDate}","until":"${untilDate}"}` +
      `&time_increment=1` +
      `&level=account` +
      `&access_token=${token}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message, type: data.error.type });
    }

    // Process into daily format
    const dailyData = (data.data || []).map(day => {
      const purchases = (day.actions || []).find(a => a.action_type === 'purchase');
      const purchaseValue = (day.action_values || []).find(a => a.action_type === 'purchase');

      return {
        date: day.date_start,
        metaSpend: parseFloat(day.spend) || 0,
        impressions: parseInt(day.impressions) || 0,
        clicks: parseInt(day.clicks) || 0,
        purchases: parseInt(purchases?.value) || 0,
        purchaseValue: parseFloat(purchaseValue?.value) || 0,
        cpc: parseFloat(day.cpc) || 0,
        cpm: parseFloat(day.cpm) || 0,
        ctr: parseFloat(day.ctr) || 0,
        cpp: purchases ? (parseFloat(day.spend) / parseInt(purchases.value)) : null,
        metaROAS: purchases && parseFloat(day.spend) > 0
          ? (parseFloat(purchaseValue?.value || 0) / parseFloat(day.spend))
          : null,
      };
    });

    res.status(200).json({
      accountId,
      pulledAt: new Date().toISOString(),
      dateRange: { start: sinceDate, end: untilDate },
      summary: {
        totalSpend: dailyData.reduce((s, d) => s + d.metaSpend, 0),
        totalPurchases: dailyData.reduce((s, d) => s + d.purchases, 0),
        avgCPP: dailyData.filter(d => d.cpp).reduce((s, d, _, a) => s + d.cpp / a.length, 0),
      },
      daily: dailyData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
