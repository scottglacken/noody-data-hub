const fs = require('fs');
const path = require('path');

// Read a context file from the bundled context/ directory
function readContext(name) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'context', name), 'utf8');
  } catch (e) {
    console.log('Context file not found:', name, e.message);
    return '';
  }
}

// Extract specific numbered sections from a knowledge base file
// Sections are delimited by ## N. or ## NN. headings
function extractSections(content, sectionNumbers) {
  if (!content || !sectionNumbers || !sectionNumbers.length) return '';
  // Split content into sections by ## heading
  var parts = content.split(/(?=^## \d+\. )/m);
  var sections = [];
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var headingMatch = part.match(/^## (\d+)\. /);
    if (headingMatch && sectionNumbers.indexOf(parseInt(headingMatch[1])) !== -1) {
      sections.push(part.trim());
    }
  }
  return sections.join('\n\n---\n\n');
}

// Map of tab names to their knowledge base section requirements
var KB_SECTIONS = {
  // Equation/Diagnose/Scale tabs
  equation: { ee: [2, 5, 6, 7, 8, 9, 10, 20], nurture: [] },
  diagnose: { ee: [2, 5, 6, 7, 8, 9, 10, 20], nurture: [] },
  scale: { ee: [2, 5, 6, 7, 8, 9, 10, 20], nurture: [] },
  // Klaviyo tab
  klaviyo: { ee: [15], nurture: [2, 4, 5, 6, 7, 8, 9, 10] },
  // Meta Ads tab
  meta: { ee: [4, 9, 13, 14], nurture: [] },
  // Google Ads tab
  gads: { ee: [5, 9, 14], nurture: [] },
  google: { ee: [5, 9, 14], nurture: [] },
  // Shopify/Daily tabs
  shopify: { ee: [10, 11, 19], nurture: [] },
  daily: { ee: [10, 11, 19], nurture: [] },
  // Xero tab
  xero: { ee: [2, 5, 6, 7, 8, 12], nurture: [] },
  // Social tab — no KB sections, context doc only
  social: { ee: [], nurture: [] },
  // Insights tab
  insights: { ee: [5, 6, 20, 21], nurture: [] },
  // Website tab
  website: { ee: [10, 11, 19], nurture: [] },
};

// Map context keys to their context doc filenames
var CONTEXT_FILES = {
  shopify: 'shopify.md',
  klaviyo: 'klaviyo.md',
  meta: 'meta-ads.md',
  google: 'google-ads.md',
  gads: 'google-ads.md',
  xero: 'xero.md',
  social: 'social.md',
  website: 'website.md',
};

// Build the knowledge context for a given tab
function buildKnowledgeContext(contextKeys) {
  var parts = [];

  // 1. Load tab-specific context docs
  var loadedFiles = {};
  if (contextKeys && contextKeys.length) {
    for (var i = 0; i < contextKeys.length; i++) {
      var key = contextKeys[i];
      var file = CONTEXT_FILES[key];
      if (file && !loadedFiles[file]) {
        var content = readContext(file);
        if (content) {
          parts.push('=== ' + file.toUpperCase().replace('.MD', '') + ' CONTEXT ===\n' + content);
          loadedFiles[file] = true;
        }
      }
    }
  }

  // 2. Determine which KB sections to load based on context keys
  var eeSections = [];
  var nurtureSections = [];
  if (contextKeys && contextKeys.length) {
    for (var i = 0; i < contextKeys.length; i++) {
      var key = contextKeys[i];
      var mapping = KB_SECTIONS[key];
      if (mapping) {
        for (var j = 0; j < mapping.ee.length; j++) {
          if (eeSections.indexOf(mapping.ee[j]) === -1) eeSections.push(mapping.ee[j]);
        }
        for (var j = 0; j < mapping.nurture.length; j++) {
          if (nurtureSections.indexOf(mapping.nurture[j]) === -1) nurtureSections.push(mapping.nurture[j]);
        }
      }
    }
  }

  // 3. Extract relevant EE sections
  if (eeSections.length) {
    var eeContent = readContext('ecommerce-equation-kb.md');
    var extracted = extractSections(eeContent, eeSections);
    if (extracted) {
      parts.push('=== ECOMMERCE EQUATION FRAMEWORK (Relevant Sections) ===\n' + extracted);
    }
  }

  // 4. Extract relevant Customer Nurture sections
  if (nurtureSections.length) {
    var nurtureContent = readContext('customer-nurture-playbook.md');
    var extracted = extractSections(nurtureContent, nurtureSections);
    if (extracted) {
      parts.push('=== CUSTOMER NURTURE PLAYBOOK (Relevant Sections) ===\n' + extracted);
    }
  }

  return parts.join('\n\n');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  var apiKey = req.headers['x-api-key'];
  if (apiKey !== 'noody-eq-2026-datahub') return res.status(401).json({ error: 'Unauthorized' });
  var anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  try {
    var body = req.body;
    var prompt = body.prompt;
    var model = body.model;
    var max_tokens = body.max_tokens;
    var customSystem = body.system;
    var contextKeys = body.context || [];
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Build knowledge context from context docs + KB sections
    var knowledgeContext = buildKnowledgeContext(contextKeys);

    // For Meta tab or when no context keys, also load the Meta Ads knowledge base (knowledge.md)
    var metaKB = '';
    if (!contextKeys.length || contextKeys.indexOf('meta') !== -1) {
      try {
        var kbUrl = (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host + '/knowledge.md';
        var kbRes = await fetch(kbUrl);
        if (kbRes.ok) metaKB = await kbRes.text();
      } catch (e) {
        console.log('Knowledge base fetch failed:', e.message);
      }
    }

    var systemPrompt = customSystem || 'You are the Ecommerce Equation Coach for Noody Skincare. You analyse business performance using the EE framework methodology. Speak plainly, use actual numbers, reference specific EE benchmarks, and tie everything to the Daily Equation (R - MC - VC - FC = Profit). Be direct, specific, and actionable.';

    // Append knowledge context
    if (knowledgeContext) {
      systemPrompt += '\n\n' + knowledgeContext;
    }

    // Append Meta Ads KB if relevant
    if (metaKB) {
      systemPrompt += '\n\n=== META ADS KNOWLEDGE BASE ===\n' + metaKB + '\n=== END META ADS KB ===';
    }

    // Add analysis instructions
    systemPrompt += '\n\nIMPORTANT: Always reference specific EE benchmarks in your analysis — e.g. "Your 18.8% DTC MER is within the EE 20-35% healthy range" or "Your Welcome Flow at $6.68/recipient exceeds the $5.00 EE target". Use the Five Situations framework to diagnose the business state. Reference Three Constraints when discussing growth limitations. Compare metrics against the EE benchmark ratios table. Be direct, specific, and actionable — no fluff.';

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    var data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    var text = (data.content || []).map(function(b) { return b.text || ''; }).join('\n');
    return res.status(200).json({ text: text, model: data.model, usage: data.usage });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
