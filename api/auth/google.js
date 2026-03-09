// /api/auth/google.js
// Step 1: Redirect to Google OAuth consent screen
// After auth, Google redirects back to /api/auth/google/callback with a code
// That code gets exchanged for a refresh token you'll save as an env var

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const appUrl = process.env.APP_URL || 'https://noody-data-hub.vercel.app';

  if (!clientId) {
    return res.status(500).json({
      error: 'GOOGLE_ADS_CLIENT_ID not set in Vercel env vars',
      setup: 'Go to console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application). Set redirect URI to: ' + appUrl + '/api/auth/google/callback'
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent', // Force refresh token generation
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(authUrl);
}
