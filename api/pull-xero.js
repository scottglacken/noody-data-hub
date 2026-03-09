import { createClient } from 'redis';

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  const client = createClient({ url: process.env.REDIS_URL, socket: { tls: true, rejectUnauthorized: false } });
  await client.connect();
  return client;
}

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const tenantId = process.env.XERO_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    return res.status(500).json({ error: 'Missing XERO env vars' });
  }

  let redis = null;
  try {
    // Get refresh token from Redis first, fall back to env var
    let refreshToken = process.env.XERO_REFRESH_TOKEN;
    try {
      redis = await getRedis();
      if (redis) {
        const stored = await redis.get('xero_refresh_token');
        if (stored) refreshToken = stored;
      }
    } catch (e) { /* fall back to env var */ }

    if (!refreshToken) {
      return res.status(500).json({ error: 'No refresh token available' });
    }

    // Exchange refresh token for access token
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.status(401).json({
        error: 'Token refresh failed',
        detail: tokenData.error_description || tokenData.error,
        fix: 'Re-authorize at /api/auth/xero',
      });
    }

    const accessToken = tokenData.access_token;

    // Save new refresh token to Redis immediately
    if (redis && tokenData.refresh_token) {
      try {
        await redis.set('xero_refresh_token', tokenData.refresh_token);
      } catch (e) { /* non-fatal */ }
    }

    // Determine date range
    const fromDate = req.query.from || '';
    const toDate = req.query.to || '';
    const months = parseInt(req.query.months) || 0;

    const plParams = new URLSearchParams();
    if (fromDate && toDate) {
      plParams.set('fromDate', fromDate);
      plParams.set('toDate', toDate);
    } else if (months > 0) {
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - months);
      plParams.set('fromDate', from.toISOString().split('T')[0]);
      plParams.set('toDate', to.toISOString().split('T')[0]);
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    };

    const [plResponse, bsResponse] = await Promise.all([
      fetch(`https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?${plParams.toString()}`, { headers }),
      fetch('https://api.xero.com/api.xro/2.0/Reports/BalanceSheet', { headers }),
    ]);

    if (!plResponse.ok) {
      const errText = await plResponse.text();
      return res.status(plResponse.status).json({ error: 'Xero P&L failed', detail: errText });
    }

    const plData = await plResponse.json();
    const bsData = bsResponse.ok ? await bsResponse.json() : null;
    const pl = parseProfitAndLoss(plData);
    const bs = bsData ? parseBalanceSheet(bsData) : null;

    return res.status(200).json({
      success: true,
      source: 'xero',
      profitAndLoss: pl,
      balanceSheet: bs,
      tokenStatus: 'auto-rotated',
      pulledAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Xero pull failed', detail: err.message });
  } finally {
    if (redis) try { await redis.quit(); } catch (e) {}
  }
}

function parseProfitAndLoss(data) {
  const report = data?.Reports?.[0];
  if (!report) return { error: 'No report data' };
  const result = { reportName: report.ReportName, dateRange: report.ReportDate, sections: {}, totals: {} };
  let currentSection = '';
  for (const row of report.Rows || []) {
    if (row.RowType === 'Header' && row.Cells?.[1]?.Value) { result.period = row.Cells[1].Value; continue; }
    if (row.RowType === 'Section') {
      currentSection = row.Title || 'Other';
      result.sections[currentSection] = { items: [], total: 0 };
      for (const subRow of row.Rows || []) {
        if (subRow.RowType === 'Row' && subRow.Cells) {
          const name = subRow.Cells[0]?.Value || '';
          const value = parseFloat(subRow.Cells[1]?.Value || '0');
          if (name) result.sections[currentSection].items.push({ name, value });
        }
        if (subRow.RowType === 'SummaryRow' && subRow.Cells) {
          const label = subRow.Cells[0]?.Value || '';
          const value = parseFloat(subRow.Cells[1]?.Value || '0');
          result.sections[currentSection].total = value;
          result.totals[label || currentSection] = value;
        }
      }
    }
    if (row.RowType === 'Row' && row.Cells) {
      const label = row.Cells[0]?.Value || '';
      const value = parseFloat(row.Cells[1]?.Value || '0');
      if (label) result.totals[label] = value;
    }
  }
  const revenue = result.totals['Total Income'] || result.totals['Total Trading Income'] || 0;
  const cogs = Math.abs(result.totals['Total Cost of Sales'] || result.totals['Total Direct Costs'] || 0);
  const grossProfit = result.totals['Gross Profit'] || (revenue - cogs);
  const totalExpenses = Math.abs(result.totals['Total Operating Expenses'] || result.totals['Total Expenses'] || 0);
  const netProfit = result.totals['Net Profit'] || (grossProfit - totalExpenses);
  result.summary = {
    revenue: Math.round(revenue * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netMargin: revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0,
    expenseRatio: revenue > 0 ? Math.round((totalExpenses / revenue) * 10000) / 100 : 0,
  };
  return result;
}

function parseBalanceSheet(data) {
  const report = data?.Reports?.[0];
  if (!report) return null;
  const result = { totals: {} };
  for (const row of report.Rows || []) {
    if (row.RowType === 'Section') {
      for (const subRow of row.Rows || []) {
        if (subRow.RowType === 'SummaryRow' && subRow.Cells) {
          const label = subRow.Cells[0]?.Value || '';
          const value = parseFloat(subRow.Cells[1]?.Value || '0');
          if (label) result.totals[label] = Math.round(value * 100) / 100;
        }
      }
    }
  }
  result.summary = {
    totalAssets: result.totals['Total Assets'] || 0,
    totalLiabilities: result.totals['Total Liabilities'] || 0,
    netAssets: result.totals['Net Assets'] || 0,
    totalEquity: result.totals['Total Equity'] || 0,
  };
  return result;
}
