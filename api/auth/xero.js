export default function handler(req, res) {
  const clientId = process.env.XERO_CLIENT_ID;
  const appUrl = process.env.APP_URL || 'https://noody-data-hub.vercel.app';

  if (!clientId) {
    return res.status(500).json({ error: 'XERO_CLIENT_ID not set' });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: appUrl + '/api/auth/xero/callback',
    scope: 'openid profile email offline_access accounting.reports.profitandloss.read accounting.reports.balancesheet.read',
    state: 'test123',
  });

  res.redirect('https://login.xero.com/identity/connect/authorize?' + params.toString());
}
