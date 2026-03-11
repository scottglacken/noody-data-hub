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
  scale: { ee: [2, 5, 6, 7, 8, 9, 10, 13, 20], nurture: [] },
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
  // Social tab
  social: { ee: [], nurture: [] },
  // Insights tab
  insights: { ee: [5, 6, 20, 21], nurture: [] },
  // Website tab
  website: { ee: [10, 11, 19], nurture: [] },
};

// Map context keys to their primary + secondary context doc filenames
var CONTEXT_FILES = {
  shopify: ['shopify.md'],
  klaviyo: ['klaviyo.md', 'customer-nurture-playbook.md'],
  meta: ['meta-ads.md', 'creative-strategy.md'],
  google: ['google-ads.md'],
  gads: ['google-ads.md'],
  xero: ['xero.md', 'demand-planning.md'],
  social: ['social.md', 'tiktok-ads.md'],
  website: ['website.md', 'high-conversion-website.md', 'offer-strategy.md'],
  equation: ['ecommerce-equation-kb.md', 'demand-planning.md'],
  diagnose: ['ecommerce-equation-kb.md', 'scale-challenge.md'],
  scale: ['scale-challenge.md', 'ecommerce-equation-kb.md'],
  insights: ['ecommerce-equation-kb.md', 'promotional-rhythm.md', 'sale-strategy.md', 'brand-strategy.md'],
  daily: ['shopify.md'],
};

// Rough token estimate (~4 chars per token)
function estimateTokens(text) { return Math.ceil((text || '').length / 4); }

// Build the knowledge context for a given tab
function buildKnowledgeContext(contextKeys) {
  var parts = [];
  var totalTokens = 0;
  var TOKEN_BUDGET = 8000; // max context tokens to keep prompts reasonable

  // 1. Load tab-specific context docs (primary first, then secondary)
  var loadedFiles = {};
  if (contextKeys && contextKeys.length) {
    for (var i = 0; i < contextKeys.length; i++) {
      var key = contextKeys[i];
      var files = CONTEXT_FILES[key];
      if (!files) continue;
      // Support legacy single string format
      if (typeof files === 'string') files = [files];
      for (var j = 0; j < files.length; j++) {
        var file = files[j];
        if (loadedFiles[file]) continue;
        var content = readContext(file);
        if (content) {
          var tokens = estimateTokens(content);
          if (totalTokens + tokens > TOKEN_BUDGET) {
            // Truncate to fit budget
            var remaining = (TOKEN_BUDGET - totalTokens) * 4;
            if (remaining > 200) {
              content = content.substring(0, remaining) + '\n\n[... truncated for length]';
              parts.push('=== ' + file.toUpperCase().replace('.MD', '') + ' CONTEXT ===\n' + content);
            }
            totalTokens = TOKEN_BUDGET;
            loadedFiles[file] = true;
            break;
          }
          parts.push('=== ' + file.toUpperCase().replace('.MD', '') + ' CONTEXT ===\n' + content);
          loadedFiles[file] = true;
          totalTokens += tokens;
        }
      }
      if (totalTokens >= TOKEN_BUDGET) break;
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

  // 3. Extract relevant EE sections (if not already loaded as full file)
  if (eeSections.length && !loadedFiles['ecommerce-equation-kb.md'] && totalTokens < TOKEN_BUDGET) {
    var eeContent = readContext('ecommerce-equation-kb.md');
    var extracted = extractSections(eeContent, eeSections);
    if (extracted) {
      var tokens = estimateTokens(extracted);
      if (totalTokens + tokens > TOKEN_BUDGET) {
        var remaining = (TOKEN_BUDGET - totalTokens) * 4;
        if (remaining > 200) extracted = extracted.substring(0, remaining) + '\n\n[... truncated]';
      }
      parts.push('=== ECOMMERCE EQUATION FRAMEWORK (Relevant Sections) ===\n' + extracted);
      totalTokens += estimateTokens(extracted);
    }
  }

  // 4. Extract relevant Customer Nurture sections (if not already loaded as full file)
  if (nurtureSections.length && !loadedFiles['customer-nurture-playbook.md'] && totalTokens < TOKEN_BUDGET) {
    var nurtureContent = readContext('customer-nurture-playbook.md');
    var extracted = extractSections(nurtureContent, nurtureSections);
    if (extracted) {
      var tokens = estimateTokens(extracted);
      if (totalTokens + tokens > TOKEN_BUDGET) {
        var remaining = (TOKEN_BUDGET - totalTokens) * 4;
        if (remaining > 200) extracted = extracted.substring(0, remaining) + '\n\n[... truncated]';
      }
      parts.push('=== CUSTOMER NURTURE PLAYBOOK (Relevant Sections) ===\n' + extracted);
      totalTokens += estimateTokens(extracted);
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
