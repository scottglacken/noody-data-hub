import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();

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
      return res.status(500).json({ error: 'No access_token in response', data: tokenData });
    }

    await kv.set('shopify_token', accessToken);
    await kv.set('shopify_shop', shop);

    const verifyRes = await fetch('https://' + shop + '/admin/api/2024-10/shop.json', {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });
    const shopData = await verifyRes.json();

    return res.status(200).json({
      success: true,
      message: 'Connected to ' + (shopData.shop ? shopData.shop.name : shop),
      shop: shop,
      scopes: tokenData.scope,
    });
  } catch (err) {
    return res.status(500).json({ error: 'OAuth failed', details: err.message, stack: err.stack });
  }
}
