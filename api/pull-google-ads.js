// /api/pull-google-ads.js
// Pulls daily Google Ads spend data by campaign
// Also handles ?type=ga4 for GA4 analytics data
// Auth: x-api-key header matching API_SECRET (same pattern as other endpoints)
// Env vars needed: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
//   GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID
//   GA4_PROPERTY_ID (for ?type=ga4)

async function getAccessToken(clientId, clientSecret, refreshToken) {
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
  return tokenResponse.json();
}

async function handleGA4(req, res, accessToken, clientId) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    return res.status(500).json({ error: 'Missing GA4_PROPERTY_ID env var' });
  }

  const days = parseInt(req.query.days) || 30;
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const endDate = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // yesterday

  const ga4Url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Run 3 reports in parallel: daily, traffic sources, landing pages
  const [dailyRes, trafficRes, landingRes] = await Promise.all([
    // 1. Daily sessions + conversions (purchase only)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'purchase' } },
        },
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    }),
    // 2. Traffic sources (top 10 channels)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'purchase' } },
        },
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '10',
      }),
    }),
    // 3. Landing pages (top 10)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'landingPagePlusQueryString' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '10',
      }),
    }),
  ]);

  // Also get total sessions (without purchase filter) for accurate session counts
  const totalSessionsRes = await fetch(ga4Url, {
    method: 'POST', headers,
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  });

  // Check for 403 (missing analytics scope)
  for (const r of [dailyRes, trafficRes, landingRes, totalSessionsRes]) {
    if (r.status === 403) {
      const errBody = await r.json().catch(() => ({}));
      const reAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + clientId +
        '&redirect_uri=https://noody-data-hub.vercel.app/api/auth/google/callback' +
        '&response_type=code&scope=https://www.googleapis.com/auth/analytics.readonly%20https://www.googleapis.com/auth/adwords' +
        '&access_type=offline&prompt=consent';
      return res.status(403).json({
        error: 'GA4 requires analytics scope. Visit this URL to re-authorize: ' + reAuthUrl,
        detail: errBody.error?.message || 'Forbidden',
      });
    }
  }

  // Check other errors
  for (const [label, r] of [['daily', dailyRes], ['traffic', trafficRes], ['landing', landingRes], ['totalSessions', totalSessionsRes]]) {
    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: `GA4 ${label} report failed: ${r.status}`, detail: errText.slice(0, 500) });
    }
  }

  const [dailyData, trafficData, landingData, totalSessionsData] = await Promise.all([
    dailyRes.json(), trafficRes.json(), landingRes.json(), totalSessionsRes.json(),
  ]);

  // Build a map of total sessions per date (unfiltered)
  const sessionsMap = {};
  if (totalSessionsData.rows) {
    for (const row of totalSessionsData.rows) {
      const rawDate = row.dimensionValues[0].value; // YYYYMMDD
      const date = rawDate.slice(0, 4) + '-' + rawDate.slice(4, 6) + '-' + rawDate.slice(6, 8);
      sessionsMap[date] = parseInt(row.metricValues[0].value) || 0;
    }
  }

  // Parse daily data — use unfiltered sessions, purchase-filtered conversions
  const daily = [];
  let totalSessions = 0;
  let totalConversions = 0;

  // Build conversions map from purchase-filtered query
  const conversionsMap = {};
  if (dailyData.rows) {
    for (const row of dailyData.rows) {
      const rawDate = row.dimensionValues[0].value;
      const date = rawDate.slice(0, 4) + '-' + rawDate.slice(4, 6) + '-' + rawDate.slice(6, 8);
      conversionsMap[date] = parseInt(row.metricValues[1].value) || 0;
    }
  }

  // Merge: iterate over all dates from totalSessions
  const allDates = Object.keys(sessionsMap).sort();
  for (const date of allDates) {
    const sessions = sessionsMap[date] || 0;
    const conversions = conversionsMap[date] || 0;
    totalSessions += sessions;
    totalConversions += conversions;
    daily.push({ date, sessions, conversions });
  }

  // Parse traffic sources
  const trafficSources = [];
  if (trafficData.rows) {
    for (const row of trafficData.rows) {
      trafficSources.push({
        channel: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value) || 0,
        conversions: parseInt(row.metricValues[1].value) || 0,
      });
    }
  }

  // Parse landing pages
  const landingPages = [];
  if (landingData.rows) {
    for (const row of landingData.rows) {
      landingPages.push({
        page: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value) || 0,
      });
    }
  }

  return res.status(200).json({
    success: true,
    source: 'ga4',
    propertyId,
    dateRange: { start: startDate, end: endDate },
    daily,
    trafficSources,
    landingPages,
    summary: {
      totalSessions,
      totalConversions,
      avgConversionRate: totalSessions > 0 ? Math.round((totalConversions / totalSessions) * 10000) / 100 : 0,
    },
    pulledAt: new Date().toISOString(),
  });
}

export default async function handler(req, res) {
  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Auth check (same pattern as pull-shopify / pull-meta) ──
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

  // For GA4, we only need OAuth credentials (not Ads-specific ones)
  if (req.query.type === 'ga4') {
    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(500).json({
        error: 'Missing env vars',
        missing: [!clientId && 'GOOGLE_ADS_CLIENT_ID', !clientSecret && 'GOOGLE_ADS_CLIENT_SECRET', !refreshToken && 'GOOGLE_ADS_REFRESH_TOKEN'].filter(Boolean),
      });
    }
    try {
      const tokenData = await getAccessToken(clientId, clientSecret, refreshToken);
      if (tokenData.error) {
        return res.status(401).json({
          error: 'Failed to refresh access token',
          detail: tokenData.error_description || tokenData.error,
          fix: 'Visit /api/auth/google to re-authorize.',
        });
      }
      return handleGA4(req, res, tokenData.access_token, clientId);
    } catch (err) {
      return res.status(500).json({ error: 'GA4 pull failed', detail: err.message });
    }
  }

  // ── Google Ads flow (default) ──
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/-/g, '');

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
    const tokenData = await getAccessToken(clientId, clientSecret, refreshToken);
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
