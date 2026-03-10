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

  // Run all 8 reports in parallel
  // Queries 1-4 are unfiltered (all sessions). Queries 5-8 are purchase-filtered (conversions only).
  const [totalSessionsRes, trafficRes, deviceRes, engagementRes, dailyPurchRes, trafficPurchRes, devicePurchRes, landingRes] = await Promise.all([
    // 1. Total sessions per day (unfiltered)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    }),
    // 2. Traffic sources — unfiltered sessions (all visitors)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '10',
      }),
    }),
    // 3. Device breakdown — unfiltered sessions
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
      }),
    }),
    // 4. Engagement summary (unfiltered)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }],
      }),
    }),
    // 5. Daily purchase conversions (purchase-filtered — for conversion counts)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'ecommercePurchases' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    }),
    // 6. Traffic sources — purchase counts only
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'ecommercePurchases' }],
        orderBys: [{ metric: { metricName: 'ecommercePurchases' }, desc: true }],
        limit: '10',
      }),
    }),
    // 7. Device breakdown — purchase counts only
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'ecommercePurchases' }],
      }),
    }),
    // 8. Landing pages (unfiltered, with engagedSessions for bounce rate)
    fetch(ga4Url, {
      method: 'POST', headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'landingPagePlusQueryString' }],
        metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '30',
      }),
    }),
  ]);

  // Check for 403 (missing analytics scope)
  const allResponses = [totalSessionsRes, trafficRes, deviceRes, engagementRes, dailyPurchRes, trafficPurchRes, devicePurchRes, landingRes];
  for (const r of allResponses) {
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
  const labeledResponses = [['totalSessions', totalSessionsRes], ['traffic', trafficRes], ['device', deviceRes], ['engagement', engagementRes], ['dailyPurch', dailyPurchRes], ['trafficPurch', trafficPurchRes], ['devicePurch', devicePurchRes], ['landing', landingRes]];
  for (const [label, r] of labeledResponses) {
    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: `GA4 ${label} report failed: ${r.status}`, detail: errText.slice(0, 500) });
    }
  }

  const [totalSessionsData, trafficData, deviceData, engagementData, dailyPurchData, trafficPurchData, devicePurchData, landingData] = await Promise.all([
    totalSessionsRes.json(), trafficRes.json(), deviceRes.json(), engagementRes.json(), dailyPurchRes.json(), trafficPurchRes.json(), devicePurchRes.json(), landingRes.json(),
  ]);

  // Build a map of total sessions per date (unfiltered)
  const sessionsMap = {};
  if (totalSessionsData.rows) {
    for (const row of totalSessionsData.rows) {
      const rawDate = row.dimensionValues[0].value;
      const date = rawDate.slice(0, 4) + '-' + rawDate.slice(4, 6) + '-' + rawDate.slice(6, 8);
      sessionsMap[date] = parseInt(row.metricValues[0].value) || 0;
    }
  }

  // Build purchases map from ecommercePurchases query
  const purchasesMap = {};
  if (dailyPurchData.rows) {
    for (const row of dailyPurchData.rows) {
      const rawDate = row.dimensionValues[0].value;
      const date = rawDate.slice(0, 4) + '-' + rawDate.slice(4, 6) + '-' + rawDate.slice(6, 8);
      purchasesMap[date] = parseInt(row.metricValues[0].value) || 0;
    }
  }

  // Merge daily: unfiltered sessions + purchase counts
  const daily = [];
  let totalSessions = 0;
  let totalConversions = 0;
  const allDates = Object.keys(sessionsMap).sort();
  for (const date of allDates) {
    const sessions = sessionsMap[date] || 0;
    const conversions = purchasesMap[date] || 0;
    totalSessions += sessions;
    totalConversions += conversions;
    daily.push({ date, sessions, conversions });
  }

  // Build purchase counts by channel
  const channelPurchases = {};
  if (trafficPurchData.rows) {
    for (const row of trafficPurchData.rows) {
      channelPurchases[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value) || 0;
    }
  }

  // Parse traffic sources — unfiltered sessions + purchase counts
  const trafficSources = [];
  if (trafficData.rows) {
    for (const row of trafficData.rows) {
      const sessions = parseInt(row.metricValues[0].value) || 0;
      const channel = row.dimensionValues[0].value;
      const conversions = channelPurchases[channel] || 0;
      trafficSources.push({
        channel,
        sessions,
        conversions,
        conversionRate: sessions > 0 ? Math.round((conversions / sessions) * 10000) / 100 : 0,
      });
    }
  }

  // Build purchase counts by device
  const devicePurchases = {};
  if (devicePurchData.rows) {
    for (const row of devicePurchData.rows) {
      devicePurchases[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value) || 0;
    }
  }

  // Parse device breakdown — unfiltered sessions + purchase counts
  const devices = [];
  if (deviceData.rows) {
    for (const row of deviceData.rows) {
      const sessions = parseInt(row.metricValues[0].value) || 0;
      const device = row.dimensionValues[0].value;
      const conversions = devicePurchases[device] || 0;
      devices.push({
        device,
        sessions,
        conversions,
        conversionRate: sessions > 0 ? Math.round((conversions / sessions) * 10000) / 100 : 0,
      });
    }
  }

  // Parse landing pages — collapse query params, merge duplicates
  const landingPageMap = {};
  if (landingData.rows) {
    for (const row of landingData.rows) {
      const rawPage = row.dimensionValues[0].value;
      const page = rawPage.split('?')[0] || rawPage;
      const sessions = parseInt(row.metricValues[0].value) || 0;
      const engagedSessions = parseInt(row.metricValues[1].value) || 0;
      if (!landingPageMap[page]) {
        landingPageMap[page] = { page, sessions: 0, engagedSessions: 0 };
      }
      landingPageMap[page].sessions += sessions;
      landingPageMap[page].engagedSessions += engagedSessions;
    }
  }
  const landingPages = Object.values(landingPageMap)
    .map(lp => ({
      page: lp.page,
      sessions: lp.sessions,
      bounceRate: lp.sessions > 0 ? Math.round(((lp.sessions - lp.engagedSessions) / lp.sessions) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  // Parse engagement summary
  let engagementRate = 0;
  let avgSessionDuration = 0;
  let bounceRate = 0;
  if (engagementData.rows && engagementData.rows.length > 0) {
    const row = engagementData.rows[0];
    const eSessions = parseInt(row.metricValues[0].value) || 0;
    const eEngaged = parseInt(row.metricValues[1].value) || 0;
    avgSessionDuration = Math.round(parseFloat(row.metricValues[2].value) * 100) / 100;
    bounceRate = Math.round(parseFloat(row.metricValues[3].value) * 10000) / 100;
    engagementRate = eSessions > 0 ? Math.round((eEngaged / eSessions) * 10000) / 100 : 0;
  }

  return res.status(200).json({
    success: true,
    source: 'ga4',
    propertyId,
    dateRange: { start: startDate, end: endDate },
    daily,
    trafficSources,
    landingPages,
    devices,
    summary: {
      totalSessions,
      totalConversions,
      avgConversionRate: totalSessions > 0 ? Math.round((totalConversions / totalSessions) * 10000) / 100 : 0,
      engagementRate,
      avgSessionDuration,
      bounceRate,
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

    // ── Step 5: Aggregate by campaign name ──
    const rawRowCount = rows.length;
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;
    let totalConversionValue = 0;

    const campaignMap = {};
    for (const row of rows) {
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

      const name = row.campaign?.name || 'Unknown';
      if (!campaignMap[name]) {
        campaignMap[name] = {
          campaign: name,
          status: row.campaign?.status || 'UNKNOWN',
          channel: row.campaign?.advertisingChannelType || 'UNKNOWN',
          spend: 0, clicks: 0, impressions: 0, conversions: 0, conversionValue: 0, entries: 0,
        };
      }
      const c = campaignMap[name];
      c.spend += spend;
      c.clicks += clicks;
      c.impressions += impressions;
      c.conversions += conversions;
      c.conversionValue += conversionValue;
      c.entries++;
    }

    const campaigns = Object.values(campaignMap).map((c) => ({
      campaign: c.campaign,
      status: c.status,
      channel: c.channel,
      spend: Math.round(c.spend * 100) / 100,
      clicks: c.clicks,
      impressions: c.impressions,
      ctr: c.impressions > 0 ? c.clicks / c.impressions : 0,
      avgCpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      conversions: Math.round(c.conversions * 100) / 100,
      conversionValue: Math.round(c.conversionValue * 100) / 100,
      entries: c.entries,
    })).sort((a, b) => b.spend - a.spend);

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
      rawRowCount,
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
