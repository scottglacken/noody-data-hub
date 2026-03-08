// /api/install.js — Initiates Shopify OAuth flow
// Visit: https://your-app.vercel.app/api/install?shop=noody-skincare.myshopify.com

export default function handler(req, res) {
  const shop = req.query.shop;
  if (!shop) {
    return res.status(400).json({ error: 'Missing ?shop= parameter' });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
  const scopes = 'read_orders,read_analytics,read_customers,read_products,read_reports,read_inventory';
  const nonce = Math.random().toString(36).substring(7);

  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${clientId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${nonce}`;

  res.redirect(authUrl);
}
