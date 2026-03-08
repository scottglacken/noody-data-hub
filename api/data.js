// /api/data.js — Returns combined daily data from all sources
// Usage: GET /api/data?days=30
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const shop = req.query.shop || process.env.SHOPIFY_STORE;
  const days = parseInt(req.query.days) || 30;

  try {
    // Get cached Shopify data
    const shopifyRaw = await kv.get(`shopify:${shop}:daily_data`);
    const shopifyData = shopifyRaw ? JSON.parse(shopifyRaw) : [];

    // Get cached Meta data
    const metaRaw = await kv.get('meta:daily_data');
    const metaData = metaRaw ? JSON.parse(metaRaw) : [];

    // Merge by date
    const dateMap = {};
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    for (const d of shopifyData) {
      if (d.date >= cutoff) {
        dateMap[d.date] = { ...d, source: 'shopify' };
      }
    }

    for (const d of metaData) {
      if (d.date >= cutoff) {
        if (dateMap[d.date]) {
          dateMap[d.date] = { ...dateMap[d.date], ...d };
        } else {
          dateMap[d.date] = { ...d, source: 'meta_only' };
        }
      }
    }

    const combined = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    // Compute equation metrics
    const variableCostPct = parseFloat(req.query.vcPct) || 35;
    const monthlyFixed = parseFloat(req.query.fixedCosts) || 15000;
    const taxRate = parseFloat(req.query.taxRate) || 15;
    const dailyFixed = monthlyFixed / 30;

    const enriched = combined.map(d => {
      const rev = d.revenue || 0;
      const ads = (d.metaSpend || 0) + (d.googleSpend || 0);
      const vc = rev * (variableCostPct / 100);
      const tax = rev * (taxRate / 100);
      const profit = rev - ads - vc - dailyFixed - tax;

      return {
        ...d,
        totalAdSpend: ads,
        variableCost: Math.round(vc * 100) / 100,
        dailyFixedCost: Math.round(dailyFixed * 100) / 100,
        taxAmount: Math.round(tax * 100) / 100,
        dailyProfit: Math.round(profit * 100) / 100,
        mer: rev > 0 ? Math.round((ads / rev) * 1000) / 10 : null,
        profitPct: rev > 0 ? Math.round((profit / rev) * 1000) / 10 : null,
      };
    });

    const totalRev = enriched.reduce((s, d) => s + (d.revenue || 0), 0);
    const totalAds = enriched.reduce((s, d) => s + d.totalAdSpend, 0);
    const totalProfit = enriched.reduce((s, d) => s + d.dailyProfit, 0);
    const totalOrders = enriched.reduce((s, d) => s + (d.orders || 0), 0);

    res.status(200).json({
      shop,
      period: { days: enriched.length, start: enriched[0]?.date, end: enriched[enriched.length - 1]?.date },
      config: { variableCostPct, monthlyFixed, taxRate },
      summary: {
        totalRevenue: Math.round(totalRev * 100) / 100,
        totalAdSpend: Math.round(totalAds * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalOrders,
        avgAOV: totalOrders > 0 ? Math.round((totalRev / totalOrders) * 100) / 100 : 0,
        blendedMER: totalRev > 0 ? Math.round((totalAds / totalRev) * 1000) / 10 : null,
        netProfitPct: totalRev > 0 ? Math.round((totalProfit / totalRev) * 1000) / 10 : null,
      },
      daily: enriched,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
