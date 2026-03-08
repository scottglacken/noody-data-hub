// /api/auth/callback.js — Handles Shopify OAuth callback, exchanges code for token
import { Redis } from '@upstash/redis'; const kv = Redis.fromEnv();

export default async function handler(req, res) {
  const { code, shop, state, hmac } = req.query;

  if (!code || !shop) {
    return res.status(400).json({ error: 'Missing code or shop parameter' });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      return res.status(500).json({ error: 'Token exchange failed', details: err });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Store token in Vercel KV
    await kv.set(`shopify:${shop}:token`, accessToken);
    await kv.set(`shopify:${shop}:installed_at`, new Date().toISOString());

    // Verify token works by fetching shop info
    const shopResponse = await fetch(`https://${shop}/admin/api/2024-10/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });
    const shopData = await shopResponse.json();

    res.status(200).json({
      success: true,
      message: `✅ Connected to ${shopData.shop?.name || shop}`,
      shop: shop,
      scopes: tokenData.scope,
      note: 'Token stored securely. You can now pull data via /api/pull-shopify',
    });
  } catch (err) {
    res.status(500).json({ error: 'OAuth callback failed', details: err.message });
  }
}
