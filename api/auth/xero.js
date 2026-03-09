// /api/auth/xero.js
// Step 1: Redirect to Xero OAuth consent screen

export default function handler(req, res) {
  const clientId = process.env.XERO_CLIENT_ID;
  const appUrl = process.env.APP_URL || 'https://noody-data-hub.vercel.app';

  if (!clientId) {
    return res.status(500).json({
      error: 'XERO_CLIENT_ID not set',
      setup: [
        '1. Go to https://developer.xero.com/app/manage',
        '2. Click "New app"',
        '3. App name: Noody Data Hub',
        '4. Integration type: Web app',
        '5. Company URL: https://noody-data-hub.vercel.app',
        '6. Redirect URI: ' + appUrl + '/api/auth/xero/callback',
        '7. Copy Client ID and Client Secret to Vercel env vars',
      ],
    });
  }

  const scopes = [
    'openid',
    'profile',
    'email',
    'accounting.reports.read',
    'accounting.settings.read',
    'offline_access',
  ].join(' ');

  const state = Math.random().toString(36).substring(7);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/xero/callback`,
    scope: scopes,
    state,
  });

  res.redirect(`https://login.xero.com/identity/connect/authorize?${params.toString()}`);
}
