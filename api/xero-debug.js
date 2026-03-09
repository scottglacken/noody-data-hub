export default async function handler(req, res) {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const refreshToken = process.env.XERO_REFRESH_TOKEN;

  // Get fresh access token
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const tokens = await tokenRes.json();

  if (tokens.error) {
    return res.json({ error: tokens });
  }

  // Get connections
  const connRes = await fetch('https://api.xero.com/connections', {
    headers: { 'Authorization': 'Bearer ' + tokens.access_token },
  });
  const connections = await connRes.json();

  return res.json({
    connections,
    newRefreshToken: tokens.refresh_token,
    note: 'Save the newRefreshToken to Vercel if different from current'
  });
}
