const https = require('https');
const { extractTokenFromRequest, verifySessionToken } = require('../lib/auth');

const API_KEY = process.env.API_KEY;

// Keep-alive agent for low latency
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 60000,
});

const COLOR_DEFINITIONS = {
  red: { name: 'Red', hex: '#d81605', criteria: 'Red, crimson, ruby, scarlet, blood red' },
  orange: { name: 'Orange', hex: '#f77501', criteria: 'Orange, tangerine, amber, coral' },
  yellow: { name: 'Yellow', hex: '#faca00', criteria: 'Yellow, gold, lemon, sunshine, blonde' },
  green: { name: 'Green', hex: '#049427', criteria: 'Green, lime, emerald, olive, foliage, grass' },
  blue: { name: 'Blue', hex: '#0075f7', criteria: 'Blue, sky blue, azure, cerulean' },
  purple: { name: 'Purple', hex: '#7b18ae', criteria: 'Purple, violet, plum' },
  pink: { name: 'Pink', hex: '#fd81c8', criteria: 'Pink, hot pink, magenta, bubblegum' },
  brown: { name: 'Brown', hex: '#974f00', criteria: 'Brown, chocolate, wood, earth' },
  grey: { name: 'Grey', hex: '#949494', criteria: 'Grey, silver, charcoal, ash' },
  black: { name: 'Black', hex: '#111111', criteria: 'Black, jet black, pitch, dark' },
  white: { name: 'White', hex: '#f5f5f5', criteria: 'White, snow, ivory, milk' },
  teal: { name: 'Teal', hex: '#03be9b', criteria: 'Teal, cyan, turquoise, aqua' },
  beige: { name: 'Beige', hex: '#e4ddcc', criteria: 'Beige, cream, tan, khaki, sand' },
  lavender: { name: 'Lavender', hex: '#fab1fd', criteria: 'Lavender, lilac, pastel purple' },
  navy: { name: 'Navy', hex: '#004456', criteria: 'Navy, dark blue, deep slate, midnight blue' },
  indigo: { name: 'Indigo', hex: '#293dd3', criteria: 'Indigo, royal blue, deep cobalt, ultramarine' },
};

const JEV_COLOR_CRITERIA = {};
for (const [key, val] of Object.entries(COLOR_DEFINITIONS)) {
  JEV_COLOR_CRITERIA[key] = val.criteria;
}

// In-memory cache for warm function invocations
const functionCache = new Map();

function postToTypeSafe(payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const options = {
      hostname: 'api.typesafe.ai',
      port: 443,
      path: '/v1/systemone',
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${body}`));
          }
        } else {
          reject(new Error(`TypeSafe API error (${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-beta-token');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // 1. STRICT SECURITY GATE: Enforce Closed Beta Session Token
  const token = extractTokenFromRequest(req);
  const session = verifySessionToken(token);

  if (!session) {
    res.status(401).json({
      error: 'Closed beta access required. Please enter your valid 6-digit invite code and Gmail address.',
      requiresAuth: true,
    });
    return;
  }

  // 2. Parse noun input
  let noun = '';
  if (req.method === 'GET') {
    noun = req.query?.noun || '';
  } else {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    noun = body.noun || '';
  }

  const normalized = noun.trim().toLowerCase();
  if (!normalized) {
    res.status(200).json({ proportions: [] });
    return;
  }

  // Check cache
  if (functionCache.has(normalized)) {
    res.status(200).json(functionCache.get(normalized));
    return;
  }

  try {
    const payload = {
      model: 'jev-latest',
      state: normalized,
      questions: {
        color: {
          type: 'choice',
          instructions: 'What color is this object, concept, or noun typically, predominantly, or symbolically associated with?',
          criteria: JEV_COLOR_CRITERIA,
        },
      },
    };

    const data = await postToTypeSafe(payload);
    const answer = data.answers && data.answers.color;
    if (!answer) {
      throw new Error('No color answer received from JEV model');
    }

    const rawProbabilities = answer.probabilities || {};
    const sortedEntries = Object.entries(rawProbabilities)
      .filter(([key, prob]) => prob > 0.001 && COLOR_DEFINITIONS[key])
      .sort((a, b) => b[1] - a[1]);

    const total = sortedEntries.reduce((sum, [, prob]) => sum + prob, 0);
    const proportions = sortedEntries.map(([key, prob]) => ({
      color: key,
      name: COLOR_DEFINITIONS[key].name,
      hex: COLOR_DEFINITIONS[key].hex,
      probability: prob,
      proportion: total > 0 ? prob / total : 0,
    }));

    const result = {
      noun: normalized,
      model: data.model,
      choice: answer.choice,
      confidence: answer.confidence,
      rawProbabilities,
      proportions,
    };

    functionCache.set(normalized, result);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/guess:', err);
    res.status(500).json({ error: err.message });
  }
};
