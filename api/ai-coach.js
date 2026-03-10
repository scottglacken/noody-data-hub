const fs = require('fs');
const path = require('path');

// Map context keys to files
const CONTEXT_FILES = {
  meta: 'meta-ads.md',
  klaviyo: 'klaviyo.md',
  shopify: 'shopify.md',
  xero: 'xero.md',
  google: 'google-ads.md',
  social: 'social.md',
};

function loadContext(keys) {
  if (!keys || !keys.length) return '';
  const parts = [];
  for (const key of keys) {
    const file = CONTEXT_FILES[key];
    if (!file) continue;
    try {
      const fp = path.join(__dirname, '..', 'context', file);
      const content = fs.readFileSync(fp, 'utf8');
      parts.push(content);
    } catch (e) {
      // Context file not found — skip silently
    }
  }
  return parts.length ? '\n\n--- CHANNEL CONTEXT ---\n' + parts.join('\n\n') : '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'noody-eq-2026-datahub') return res.status(401).json({ error: 'Unauthorized' });
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const { prompt, model, max_tokens, context } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Load relevant context docs
    const contextText = loadContext(context);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1500,
        system: 'You are the Ecommerce Equation Business Coach trained on Jay Wright\'s methodology. Speak plainly, use actual numbers, tie everything to daily profit. Key frameworks: Daily Equation (Revenue-Marketing-VC-FC-Tax=Profit), Three Constraints (Bandwidth/Efficiency/Throughput), Five Situations (1=Profitable scale it, 2=High FC scale to spread, 3=High VC fix margins, 4=High MER diagnose CPP vs RPV, 5=Edge fix MER then VC then scale). Benchmarks: FC 10-20%, VC 25-40%, MER 20-35%, Net Profit 10-20%, LER $2+. RPV=CR*AOV is the key lever. Always model the double revenue scenario. Be direct and specific. Keep analysis to 3-5 sentences with specific numbers and one clear actionable recommendation.' + contextText,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    const text = (data.content || []).map(b => b.text || '').join('\n');
    return res.status(200).json({ text, model: data.model, usage: data.usage });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
