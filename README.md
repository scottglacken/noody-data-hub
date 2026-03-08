# Noody Data Hub — Ecommerce Equation Data Pipeline

Pulls daily data from Shopify + Meta Ads, computes Daily Equation metrics,
and serves a combined API for the Ecommerce Equation Tracker.

Runs on Vercel (free tier). Auto-pulls daily at 7am NZST via cron.

---

## Quick Setup (15 minutes)

### Step 1: Deploy to Vercel

```bash
# Clone or download this folder, then:
cd noody-data-hub
npx vercel          # Follow prompts to deploy
```

Or push to a GitHub repo and connect it to Vercel at vercel.com/new.

After deploying, note your app URL (e.g., `https://noody-data-hub.vercel.app`).

### Step 2: Set Up Vercel KV (Token Storage)

1. Go to your Vercel Dashboard → your project → Storage
2. Click "Create Database" → select "KV" → Create
3. It auto-connects environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`)

### Step 3: Add Environment Variables

Go to Vercel Dashboard → your project → Settings → Environment Variables. Add:

| Variable | Value | Where to find it |
|----------|-------|-------------------|
| `APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `API_SECRET` | Any random string (e.g., `noody-eq-2026-secret`) | You create this |
| `CRON_SECRET` | Any random string | You create this |
| `SHOPIFY_CLIENT_ID` | Your app's Client ID | dev.shopify.com → App → Settings |
| `SHOPIFY_CLIENT_SECRET` | Your app's Secret | dev.shopify.com → App → Settings |
| `SHOPIFY_STORE` | `noody-skincare.myshopify.com` | Your store URL |
| `META_ACCESS_TOKEN` | System User token | See Step 5 below |
| `META_AD_ACCOUNT_ID` | Numbers only (no `act_` prefix) | Meta Ads Manager URL |

**Redeploy** after adding env vars: Vercel Dashboard → Deployments → Redeploy.

### Step 4: Connect Shopify

1. Go to dev.shopify.com → your "Business Intelligence System" app
2. Under Settings → App URL, change it to: `https://your-app.vercel.app/api/install`
3. Under "Allowed redirection URL(s)", add: `https://your-app.vercel.app/api/auth/callback`
4. Save

Now visit this URL in your browser:
```
https://your-app.vercel.app/api/install?shop=noody-skincare.myshopify.com
```

This redirects to Shopify, asks you to authorize, then captures and stores the API token.
You should see a success JSON response. **Done — Shopify is connected.**

### Step 5: Connect Meta Ads

1. Go to business.facebook.com → Business Settings
2. Left sidebar → Users → System Users
3. If no system user exists, click "Add" → name it "Data Hub" → role: Admin
4. Click the system user → "Generate New Token"
5. Select your app (or any app connected to your ad account)
6. Add the permission: `ads_read`
7. Click "Generate Token" → copy the token

Your **Ad Account ID** is the number in your Ads Manager URL:
`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=123456789`
→ Account ID is `123456789`

Add both to Vercel env vars (Step 3) and redeploy.

---

## How It Works

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/install?shop=xxx` | Start Shopify OAuth flow |
| `GET /api/auth/callback` | Shopify OAuth callback (automatic) |
| `GET /api/pull-shopify?days=30` | Pull Shopify orders (needs `x-api-key` header) |
| `GET /api/pull-meta?days=30` | Pull Meta ad spend (needs `x-api-key` header) |
| `GET /api/data?days=30` | Get combined daily data (needs `x-api-key` header) |
| `GET /api/cron-pull` | Daily auto-pull (triggered by Vercel Cron) |

### Auth

All data endpoints require the `x-api-key` header matching your `API_SECRET` env var:

```bash
curl -H "x-api-key: your-api-secret" \
  https://your-app.vercel.app/api/data?days=30
```

### Daily Cron

The cron job runs automatically at 7am NZST (19:00 UTC) every day via `vercel.json`.
It pulls the last 2 days from Shopify and Meta, merges with existing data.

---

## Testing

After setup, test each connection:

```bash
# Test Shopify pull (last 7 days)
curl -H "x-api-key: YOUR_SECRET" \
  "https://your-app.vercel.app/api/pull-shopify?shop=noody-skincare.myshopify.com&days=7"

# Test Meta pull (last 7 days)
curl -H "x-api-key: YOUR_SECRET" \
  "https://your-app.vercel.app/api/pull-meta?days=7"

# Get combined daily data
curl -H "x-api-key: YOUR_SECRET" \
  "https://your-app.vercel.app/api/data?days=30"
```

---

## Initial Historical Pull

For the first time, pull maximum history:

```bash
# Pull last 365 days of Shopify orders
curl -H "x-api-key: YOUR_SECRET" \
  "https://your-app.vercel.app/api/pull-shopify?shop=noody-skincare.myshopify.com&days=365"

# Pull last 365 days of Meta spend
curl -H "x-api-key: YOUR_SECRET" \
  "https://your-app.vercel.app/api/pull-meta?days=365"
```

This may take 30-60 seconds for large order volumes. After the initial pull,
the daily cron handles incremental updates automatically.

---

## Adding Google Ads (Future)

Google Ads API requires more setup (Developer Token + OAuth). Options:
1. Export daily spend from Google Ads as CSV and upload manually
2. Link Google Ads to a Google Sheet → pull from Sheets API
3. Full Google Ads API integration (requires approved Developer Token)

---

## Notes

- Shopify session data: The Admin API doesn't expose "sessions" directly.
  Sessions come from Shopify Analytics which has limited API access.
  Best options: Google Analytics integration, or manual daily input.
- Meta tokens expire after ~60 days for System Users. Set a reminder to refresh.
- All data is stored in Vercel KV and persists between deployments.
- The combined /api/data endpoint computes the full Daily Equation
  using configurable variable cost %, fixed costs, and tax rate via query params.
