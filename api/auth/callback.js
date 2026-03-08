export default async function handler(req, res) {
  const { code, shop } = req.query;

  if (!code || !shop) {
    return res.status(400).json({ error: 'Missing code or shop', query: req.query });
  }

  try {
    const tokenUrl = 'https://' + shop + '/admin/oauth/access_token';

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code: code,
      }),
    });

    const responseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Token exchange failed', status: tokenResponse.status, details: responseText });
    }

    const tokenData = JSON.parse(responseText);
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({ error: 'No access_token', data: tokenData });
    }

    return res.status(200).json({
      success: true,
      message: 'SAVE THIS TOKEN as SHOPIFY_ACCESS_TOKEN in your Vercel env vars',
      shop: shop,
      access_token: accessToken,
      scopes: tokenData.scope,
    });
  } catch (err) {
    return res.status(500).json({ error: 'OAuth failed', details: err.message });
  }
}
