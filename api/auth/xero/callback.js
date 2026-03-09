// /api/auth/xero/callback.js
// Step 2: Exchange code for tokens + get tenant ID

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: `Xero OAuth error: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code received' });
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || 'https://noody-data-hub.vercel.app';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET' });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${appUrl}/api/auth/xero/callback`,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return res.status(400).json({
        error: 'Token exchange failed',
        detail: tokens.error_description || tokens.error,
      });
    }

    if (!tokens.refresh_token) {
      return res.status(400).json({
        error: 'No refresh token returned',
        fix: 'Make sure offline_access scope is included',
      });
    }

    // Get tenant (organisation) connections
    let tenants = [];
    try {
      const connResponse = await fetch('https://api.xero.com/connections', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      tenants = await connResponse.json();
    } catch (e) {
      tenants = [{ error: e.message }];
    }

    // Test: pull org name
    let orgName = 'Unknown';
    let tenantId = '';
    if (tenants.length > 0 && tenants[0].tenantId) {
      tenantId = tenants[0].tenantId;
      orgName = tenants[0].tenantName || 'Connected';
    }

    return res.status(200).json({
      success: true,
      message: '🎉 Xero OAuth complete!',
      refresh_token: tokens.refresh_token,
      tenant_id: tenantId,
      organisation: orgName,
      all_tenants: tenants.map(t => ({
        id: t.tenantId,
        name: t.tenantName,
        type: t.tenantType,
      })),
      next_steps: [
        '1. Copy the refresh_token above',
        '2. Go to Vercel → noody-data-hub → Settings → Environment Variables',
        '3. Add: XERO_REFRESH_TOKEN = ' + tokens.refresh_token,
        '4. Add: XERO_TENANT_ID = ' + tenantId,
        '5. Redeploy',
        '6. Test: GET /api/pull-xero',
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: 'Token exchange failed', detail: err.message });
  }
}
