// /api/pull-google-ads.js
// Pulls daily Google Ads spend data by campaign
// Auth: x-api-key header matching API_SECRET (same pattern as other endpoints)
// Env vars needed: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
//   GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID

export default async function handler(req, res) {
  // ── Auth check (same pattern as pull-shopify / pull-meta) ──
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/-/g, ''); // Strip dashes

  // ── Validate all env vars present ──
  const missing = [];
  if (!clientId) missing.push('GOOGLE_ADS_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_ADS_CLIENT_SECRET');
  if (!refreshToken) missing.push('GOOGLE_ADS_REFRESH_TOKEN');
  if (!developerToken) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (!customerId) missing.push('GOOGLE_ADS_CUSTOMER_ID');

  if (missing.length > 0) {
    return res.status(500).json({
      error: 'Missing env vars',
      missing,
      setup: 'Visit /api/auth/google to complete OAuth flow first',
    });
  }

  try {
    // ── Step 1: Exchange refresh token for fresh access token ──
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(401).json({
        error: 'Failed to refresh access token',
        detail: tokenData.error_description || tokenData.error,
        fix: 'Refresh token may be expired. Visit /api/auth/google to re-authorize.',
      });
    }

    const accessToken = tokenData.access_token;

    // ── Step 2: Determine date range ──
    // Default: yesterday. Accept ?date=YYYY-MM-DD or ?days=7 for custom range
    const queryDate = req.query.date;
    const queryDays = parseInt(req.query.days) || 1;

    let dateFilter;
    if (queryDate) {
      // Specific date
      dateFilter = `segments.date = '${queryDate}'`;
    } else if (queryDays === 1) {
      // Yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      dateFilter = `segments.date = '${yStr}'`;
    } else {
      // Last N days
      dateFilter = `segments.date DURING LAST_${queryDays}_DAYS`;
    }

    // ── Step 3: Query Google Ads API via REST (searchStream) ──
    const gaqlQuery = `
      SELECT
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM campaign
      WHERE ${dateFilter}
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;

    const adsResponse = await fetch(
      `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
        },
        body: JSON.stringify({ query: gaqlQuery }),
      }
    );

    if (!adsResponse.ok) {
      const errorBody = await adsResponse.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorBody);
      } catch {
        parsedError = errorBody;
      }
      return res.status(adsResponse.status).json({
        error: 'Google Ads API request failed',
        status: adsResponse.status,
        detail: parsedError,
      });
    }

    const rawData = await adsResponse.json();

    // ── Step 4: Parse searchStream response ──
    // searchStream returns an array of result batches
    const rows = [];
    if (Array.isArray(rawData)) {
      for (const batch of rawData) {
        if (batch.results) {
          rows.push(...batch.results);
        }
      }
    }

    // ── Step 5: Transform into clean output ──
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;
    let totalConversionValue = 0;

    const campaigns = rows.map((row) => {
      const costMicros = parseInt(row.metrics?.costMicros || '0');
      const spend = costMicros / 1_000_000;
      const clicks = parseInt(row.metrics?.clicks || '0');
      const impressions = parseInt(row.metrics?.impressions || '0');
      const conversions = parseFloat(row.metrics?.conversions || '0');
      const conversionValue = parseFloat(row.metrics?.conversionsValue || '0');

      totalSpend += spend;
      totalClicks += clicks;
      totalImpressions += impressions;
      totalConversions += conversions;
      totalConversionValue += conversionValue;

      return {
        campaign: row.campaign?.name || 'Unknown',
        status: row.campaign?.status || 'UNKNOWN',
        channel: row.campaign?.advertisingChannelType || 'UNKNOWN',
        date: row.segments?.date || null,
        spend: Math.round(spend * 100) / 100,
        clicks,
        impressions,
        ctr: parseFloat(row.metrics?.ctr || '0'),
        avgCpc: parseInt(row.metrics?.averageCpc || '0') / 1_000_000,
        conversions,
        conversionValue: Math.round(conversionValue * 100) / 100,
      };
    });

    // ── Step 6: Return clean response ──
    const summary = {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalClicks,
      totalImpressions,
      totalConversions: Math.round(totalConversions * 100) / 100,
      totalConversionValue: Math.round(totalConversionValue * 100) / 100,
      avgCtr: totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 10000) / 100
        : 0,
      costPerConversion: totalConversions > 0
        ? Math.round((totalSpend / totalConversions) * 100) / 100
        : 0,
      roas: totalSpend > 0
        ? Math.round((totalConversionValue / totalSpend) * 100) / 100
        : 0,
      campaignCount: campaigns.length,
    };

    return res.status(200).json({
      success: true,
      source: 'google_ads',
      customerId,
      dateFilter,
      summary,
      campaigns,
      pulledAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Unexpected error pulling Google Ads data',
      detail: err.message,
    });
  }
}
