export default function handler(req, res) {
  const clientId = process.env.XERO_CLIENT_ID;
  const appUrl = process.env.APP_URL || 'https://noody-data-hub.vercel.app';

  if (!clientId) {
    return res.status(500).json({ error: 'XERO_CLIENT_ID not set' });
  }

  const scopes = 'openid profile email offline_access';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: appUrl + '/api/auth/xero/callback',
    scope: scopes,
    state: Math.random().toString(36).substring(7),
  });

  res.redirect('https://login.xero.com/identity/connect/authorize?' + params.toString());
}
