// /api/auth/google/callback.js
// Step 2: Google redirects here with ?code=...
// Exchanges code for access_token + refresh_token
// Displays the refresh token for you to save as GOOGLE_ADS_REFRESH_TOKEN in Vercel

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: `Google OAuth error: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ error: 'No authorization code received from Google' });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || 'https://noody-data-hub.vercel.app';

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'Missing GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_CLIENT_SECRET env vars'
    });
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return res.status(400).json({
        error: 'Token exchange failed',
        detail: tokens.error_description || tokens.error,
      });
    }

    if (!tokens.refresh_token) {
      return res.status(400).json({
        error: 'No refresh token returned. This usually means you already authorized this app before.',
        fix: 'Go to myaccount.google.com/permissions → Remove access for this app → Then visit /api/auth/google again',
      });
    }

    // Test the token works by listing accessible customers
    let testResult = 'Skipped (no developer token set)';
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (devToken) {
      try {
        const testResponse = await fetch(
          'https://googleads.googleapis.com/v18/customers:listAccessibleCustomers',
          {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'developer-token': devToken,
            },
          }
        );
        const testData = await testResponse.json();
        testResult = testData.resourceNames
          ? `✅ Access confirmed. Accounts: ${testData.resourceNames.join(', ')}`
          : `⚠️ ${JSON.stringify(testData)}`;
      } catch (e) {
        testResult = `⚠️ Test failed: ${e.message}`;
      }
    }

    // Return the refresh token — user saves this as env var
    res.status(200).json({
      success: true,
      message: '🎉 Google Ads OAuth complete!',
      refresh_token: tokens.refresh_token,
      access_token_preview: tokens.access_token?.substring(0, 20) + '...',
      test: testResult,
      next_steps: [
        '1. Copy the refresh_token above',
        '2. Go to Vercel → noody-data-hub → Settings → Environment Variables',
        '3. Add: GOOGLE_ADS_REFRESH_TOKEN = <paste refresh token>',
        '4. Also add: GOOGLE_ADS_CUSTOMER_ID = <your customer ID, no dashes>',
        '5. Also add: GOOGLE_ADS_DEVELOPER_TOKEN = <your developer token>',
        '6. Redeploy (or it picks up on next deploy)',
        '7. Test: GET /api/pull-google-ads',
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Token exchange request failed', detail: err.message });
  }
}
