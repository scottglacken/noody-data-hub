// /api/pull-xero.js
// Pulls Profit & Loss, Balance Sheet summary, and bank balances from Xero
// Auth: x-api-key header matching API_SECRET
// Env vars: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REFRESH_TOKEN, XERO_TENANT_ID

export default async function handler(req, res) {
  // Auth check
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const refreshToken = process.env.XERO_REFRESH_TOKEN;
  const tenantId = process.env.XERO_TENANT_ID;

  const missing = [];
  if (!clientId) missing.push('XERO_CLIENT_ID');
  if (!clientSecret) missing.push('XERO_CLIENT_SECRET');
  if (!refreshToken) missing.push('XERO_REFRESH_TOKEN');
  if (!tenantId) missing.push('XERO_TENANT_ID');

  if (missing.length > 0) {
    return res.status(500).json({
      error: 'Missing env vars',
      missing,
      setup: 'Visit /api/auth/xero to complete OAuth flow',
    });
  }

  try {
    // Step 1: Refresh access token
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
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

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(401).json({
        error: 'Failed to refresh Xero token',
        detail: tokenData.error_description || tokenData.error,
        fix: 'Token may be expired. Visit /api/auth/xero to re-authorize.',
      });
    }

    const accessToken = tokenData.access_token;

    // If Xero issued a new refresh token, log it (user should update env var)
    const newRefreshToken = tokenData.refresh_token;
    const tokenRotated = newRefreshToken && newRefreshToken !== refreshToken;

    // Step 2: Determine date range
    // Default: current financial year. Accept ?months=3 for last 3 months, etc.
    const months = parseInt(req.query.months) || 0; // 0 = YTD
    const fromDate = req.query.from || '';
    const toDate = req.query.to || '';

    // Step 3: Fetch P&L Report
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
    // If no params, Xero defaults to current financial year

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    };

    const [plResponse, bsResponse, bankResponse] = await Promise.all([
      fetch(`https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?${plParams.toString()}`, { headers }),
      fetch('https://api.xero.com/api.xro/2.0/Reports/BalanceSheet', { headers }),
      fetch('https://api.xero.com/api.xro/2.0/Accounts?where=Type%3D%3D%22BANK%22', { headers }),
    ]);

    if (!plResponse.ok) {
      const errText = await plResponse.text();
      return res.status(plResponse.status).json({
        error: 'Xero P&L request failed',
        status: plResponse.status,
        detail: errText,
      });
    }

    const plData = await plResponse.json();
    const bsData = bsResponse.ok ? await bsResponse.json() : null;
    const bankData = bankResponse.ok ? await bankResponse.json() : null;

    // Step 4: Parse the P&L report
    const pl = parseProfitAndLoss(plData);
    const bs = bsData ? parseBalanceSheet(bsData) : null;
    const banks = bankData?.Accounts?.map(a => ({
      name: a.Name,
      code: a.Code,
      type: a.BankAccountType,
    })) || [];

    // Step 5: Return clean response
    return res.status(200).json({
      success: true,
      source: 'xero',
      tenantId,
      profitAndLoss: pl,
      balanceSheet: bs,
      bankAccounts: banks,
      tokenRotated,
      ...(tokenRotated ? {
        warning: 'Xero issued a new refresh token. Update XERO_REFRESH_TOKEN in Vercel.',
        newRefreshToken,
      } : {}),
      pulledAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Unexpected error pulling Xero data',
      detail: err.message,
    });
  }
}

// Parse Xero's nested report format into clean numbers
function parseProfitAndLoss(data) {
  const report = data?.Reports?.[0];
  if (!report) return { error: 'No report data' };

  const result = {
    reportName: report.ReportName,
    dateRange: report.ReportDate,
    fromDate: report.Rows?.[0]?.Cells?.[1]?.Value || '',
    sections: {},
    totals: {},
  };

  let currentSection = '';

  for (const row of report.Rows || []) {
    if (row.RowType === 'Header') {
      // Extract date column header
      if (row.Cells?.[1]?.Value) {
        result.period = row.Cells[1].Value;
      }
      continue;
    }

    if (row.RowType === 'Section') {
      currentSection = row.Title || 'Other';
      result.sections[currentSection] = { items: [], total: 0 };

      for (const subRow of row.Rows || []) {
        if (subRow.RowType === 'Row' && subRow.Cells) {
          const name = subRow.Cells[0]?.Value || '';
          const value = parseFloat(subRow.Cells[1]?.Value || '0');
          if (name) {
            result.sections[currentSection].items.push({ name, value });
          }
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

  // Compute key metrics
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
