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
    const { prompt, model, max_tokens, system: customSystem } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Fetch the EE knowledge base for context
    var knowledgeBase = '';
    try {
      var kbUrl = (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host + '/knowledge.md';
      var kbRes = await fetch(kbUrl);
      if (kbRes.ok) knowledgeBase = await kbRes.text();
    } catch (e) {
      console.log('Knowledge base fetch failed:', e.message);
    }

    var systemPrompt = customSystem || 'You are the Ecommerce Equation Meta Ads Coach created by Koby. You analyse Meta ad accounts using the EE framework methodology. Speak plainly, use actual numbers, tie everything to daily profit and the Ecommerce Equation.';

    // Append the knowledge base
    if (knowledgeBase) {
      systemPrompt += '\n\n=== ECOMMERCE EQUATION COMPLETE KNOWLEDGE BASE ===\n' + knowledgeBase + '\n=== END KNOWLEDGE BASE ===\n\nIMPORTANT: Always reference specific EE framework concepts in your analysis. Use Marvel Math terminology (Superhero/Hero/Sidekick/Civilian/Villain) for ad classification. Reference the Traffic Light System for frequency assessment. Use the Refresh System process for optimisation advice. Apply CPP thresholds based on AOV x MER. Compare within funnel stages only (TOF vs TOF, not TOF vs MOF). Reference the Scale Challenge and Greenlight to Scale process when discussing scaling. Be direct, specific, and actionable.';
    } else {
      systemPrompt += '\n\nKey frameworks: Daily Equation (Revenue-Marketing-VC-FC-Tax=Profit), Three Constraints (Bandwidth/Efficiency/Throughput), Five Situations (1=Profitable scale it, 2=High FC scale to spread, 3=High VC fix margins, 4=High MER diagnose CPP vs RPV, 5=Edge fix MER then VC then scale). Marvel Math: Superhero (green CPP + green freq + high reach), Hero (green CPP + green freq), Sidekick (mixed), Civilian (weak), Villain (kill immediately). Campaign Freq Benchmarks (14d): TOF <=2.0, TOM <=3.5, MOF <=4.0, BOF <=6.0. Ad Freq: TOF <=1.4, TOM <=1.8, MOF <=2.0, BOF <=2.4. CPP Thresholds: TOF good=AOVxMERx2, MOF good=AOVxMER, BOF good=AOVxMERx0.75. Funnel Split: TOF 45%, ASC 35%, MOF 20%. Benchmarks: FC 10-20%, VC 25-40%, MER 20-35%, Net Profit 10-20%, LER $2+. RPV=CR*AOV is the key lever. Be direct and specific.';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    const text = (data.content || []).map(b => b.text || '').join('\n');
    return res.status(200).json({ text, model: data.model, usage: data.usage });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
