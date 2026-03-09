import { createClient } from 'redis';

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: { tls: true, rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error) return res.status(400).json({ error });
  if (!code) return res.status(400).json({ error: 'No code received' });

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || 'https://noody-data-hub.vercel.app';

  try {
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
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
    const tokens = await tokenRes.json();
    if (tokens.error) return res.status(400).json({ error: tokens.error_description || tokens.error });

    // Save to Redis
    let savedToRedis = false;
    let redis = null;
    try {
      redis = await getRedis();
      if (redis && tokens.refresh_token) {
        await redis.set('xero_refresh_token', tokens.refresh_token);
        savedToRedis = true;
      }
    } catch (e) {
      console.error('Redis error:', e.message);
    } finally {
      if (redis) try { await redis.quit(); } catch (e) {}
    }

    // Get tenant
    let tenantId = '', orgName = 'Unknown';
    try {
      const connRes = await fetch('https://api.xero.com/connections', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      const tenants = await connRes.json();
      if (tenants?.[0]) { tenantId = tenants[0].tenantId; orgName = tenants[0].tenantName; }
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Xero OAuth complete!',
      refresh_token: tokens.refresh_token,
      tenant_id: tenantId,
      organisation: orgName,
      tokenSavedToRedis: savedToRedis,
      next_steps: savedToRedis
        ? ['Token auto-rotates via Redis — no manual updates needed']
        : ['Add XERO_REFRESH_TOKEN to Vercel env vars (Redis save failed)'],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
