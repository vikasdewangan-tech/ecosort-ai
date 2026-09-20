/**
 * EcoSort AI - Backend Server
 * -----------------------------------------------------------------
 * Responsibilities:
 *  1. Accept a waste image upload from the frontend.
 *  2. Send the image to a vision-capable AI API (OpenAI-compatible)
 *     for analysis, OR return a simulated Demo Mode response if no
 *     API key is configured / demo mode is explicitly requested.
 *  3. Parse and validate the AI's structured JSON response.
 *  4. Return a clean, safe JSON payload to the frontend.
 *
 * The AI API key is NEVER exposed to the frontend. It only lives in
 * this server's process (loaded from environment variables via .env).
 * -----------------------------------------------------------------
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');

const app = express();

// ------------------------------------------------------------------
// Configuration (from environment variables — never hardcode secrets)
// ------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_API_URL = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Whether real AI mode is available (only true if a key is configured)
const AI_CONFIGURED = Boolean(AI_API_KEY && AI_API_KEY.trim().length > 0);

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '2mb' }));

// Multer: store uploaded image in memory only (never saved to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
  },
});

// ------------------------------------------------------------------
// Supported waste categories (kept in one place for consistency)
// ------------------------------------------------------------------
const WASTE_CATEGORIES = [
  'Recyclable / Dry Waste',
  'Organic / Wet Waste',
  'E-Waste',
  'Hazardous Waste',
  'General / Non-Recyclable Waste',
];

// ------------------------------------------------------------------
// AI System Prompt
// ------------------------------------------------------------------
const SYSTEM_PROMPT = `You are EcoSort AI, a careful waste-identification and recycling-guidance assistant.

Rules you must follow strictly:
- Analyze ONLY what is visibly present in the image. Do not invent details you cannot see.
- Identify the single most likely waste item in the image (if multiple items are visible, identify the most prominent one and mention the ambiguity in "reason").
- Classify the item into EXACTLY ONE of these categories: ${WASTE_CATEGORIES.join(', ')}.
- Never claim 100% certainty. Use "High", "Medium", or "Low" for confidence, based on image clarity.
- Give safe, practical disposal guidance. Never give dangerous instructions.
- For "E-Waste" or "Hazardous Waste" items, always recommend checking an authorized local collection/disposal facility.
- Always remind the user (in "warning") that local waste-management rules can vary by city/region.
- If the image is unclear, too dark, or does not show identifiable waste, say so honestly in "reason" and lower your confidence.

You MUST respond with ONLY a single valid JSON object, with no markdown formatting, no code fences, and no extra text before or after it. Use exactly this structure:

{
  "item": "string - the identified item name",
  "category": "string - one of the exact category names listed above",
  "confidence": "High | Medium | Low",
  "reason": "string - brief explanation of why it was classified this way",
  "disposal": "string - practical disposal/recycling guidance",
  "sustainability_tip": "string - one short actionable sustainability tip related to this item",
  "warning": "string - a short note, e.g. about local rules varying, or empty string if not needed"
}`;

// ------------------------------------------------------------------
// Demo Mode sample data (used when no AI key is configured, or when
// the frontend explicitly requests demo mode)
// ------------------------------------------------------------------
const DEMO_SCENARIOS = {
  plastic_bottle: {
    item: 'Plastic Water Bottle',
    category: 'Recyclable / Dry Waste',
    confidence: 'High',
    reason: 'The item shows the typical shape, cap, and translucent material of a single-use plastic beverage bottle.',
    disposal: 'Empty and rinse the bottle, flatten it if possible, and place it in your dry/recyclable waste stream according to local waste-management rules.',
    sustainability_tip: 'Consider switching to a reusable bottle to reduce single-use plastic waste over time.',
    warning: 'Local recycling rules may vary — check whether caps should be removed before recycling in your area.',
  },
  banana_peel: {
    item: 'Banana Peel',
    category: 'Organic / Wet Waste',
    confidence: 'High',
    reason: 'The item shows the characteristic curved shape, color, and texture of a banana peel.',
    disposal: 'Place the peel in your organic/wet waste or composting bin. Avoid mixing it with dry recyclables.',
    sustainability_tip: 'Home composting of fruit and vegetable peels can turn kitchen waste into nutrient-rich soil.',
    warning: 'Composting guidelines can differ between municipalities and community composting programs.',
  },
  aluminum_can: {
    item: 'Aluminum Can',
    category: 'Recyclable / Dry Waste',
    confidence: 'High',
    reason: 'The item shows the metallic cylindrical shape and ring-pull top typical of an aluminum beverage can.',
    disposal: 'Rinse out any residue and place the can in your dry/recyclable waste stream. Crushing it can save space.',
    sustainability_tip: 'Aluminum can be recycled repeatedly without losing quality, making it one of the most valuable materials to recycle.',
    warning: 'Local waste-management rules may vary regarding whether cans should be crushed before collection.',
  },
  old_smartphone: {
    item: 'Old Smartphone',
    category: 'E-Waste',
    confidence: 'Medium',
    reason: 'The item shows the rectangular shape, screen, and camera module typical of a smartphone. Exact model cannot be confirmed from the image.',
    disposal: 'Do not place this in regular household waste. Take it to an authorized e-waste collection center or a manufacturer take-back program.',
    sustainability_tip: 'Consider donating or trading in working phones — refurbishment extends the useful life of electronic devices and reduces e-waste.',
    warning: 'E-waste often contains hazardous materials; always use authorized local e-waste collection facilities.',
  },
  used_tissue: {
    item: 'Used Tissue Paper',
    category: 'General / Non-Recyclable Waste',
    confidence: 'Medium',
    reason: 'The item shows crumpled, soft paper consistent with used tissue, which is typically contaminated and not recyclable.',
    disposal: 'Dispose of used tissues in general waste. They are usually not accepted in paper recycling due to contamination.',
    sustainability_tip: 'Where possible, use reusable cloth alternatives for non-medical purposes to reduce daily paper waste.',
    warning: 'Some municipal composting programs may accept unbleached, uncontaminated tissue — check local guidelines.',
  },
};

const DEMO_SCENARIO_KEYS = Object.keys(DEMO_SCENARIOS);

// ------------------------------------------------------------------
// Helper: safely parse the AI's JSON response
// ------------------------------------------------------------------
function safeParseAIResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Strip markdown code fences if the model added them despite instructions
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

  // Extract the first {...} block in case there's stray text around it
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(cleaned);
    return validateAIResult(parsed);
  } catch (err) {
    return null;
  }
}

// ------------------------------------------------------------------
// Helper: validate the parsed AI result has the fields we expect
// ------------------------------------------------------------------
function validateAIResult(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const required = ['item', 'category', 'confidence', 'reason', 'disposal', 'sustainability_tip'];
  for (const field of required) {
    if (typeof obj[field] !== 'string' || obj[field].trim() === '') {
      return null;
    }
  }

  // Normalize category to one of the supported values (best-effort match)
  const matchedCategory = WASTE_CATEGORIES.find(
    (c) => c.toLowerCase() === String(obj.category).toLowerCase()
  );

  return {
    item: obj.item.trim(),
    category: matchedCategory || obj.category.trim(),
    confidence: ['High', 'Medium', 'Low'].includes(obj.confidence) ? obj.confidence : 'Medium',
    reason: obj.reason.trim(),
    disposal: obj.disposal.trim(),
    sustainability_tip: obj.sustainability_tip.trim(),
    warning: typeof obj.warning === 'string' ? obj.warning.trim() : 'Local waste-management rules may vary.',
  };
}

// ------------------------------------------------------------------
// Helper: call the AI vision API (OpenAI-compatible chat completions)
// ------------------------------------------------------------------
async function callVisionAI(base64Image, mimeType) {
  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this waste item image and respond with ONLY the JSON object described in your instructions.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  };

  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AI_API_ERROR: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return content;
}

// ------------------------------------------------------------------
// Route: health check
// ------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: AI_CONFIGURED,
    mode: AI_CONFIGURED ? 'AI Analysis Mode' : 'Demo Mode',
  });
});

// ------------------------------------------------------------------
// Route: analyze waste image
// ------------------------------------------------------------------
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    const forceDemo = req.body?.demoMode === 'true' || req.query?.demoMode === 'true';

    // ---------- DEMO MODE ----------
    if (!AI_CONFIGURED || forceDemo) {
      // Pick a demo scenario: use the one requested by the frontend,
      // or a random one for variety when nothing specific is picked.
      const requestedScenario = req.body?.scenario;
      const key = DEMO_SCENARIO_KEYS.includes(requestedScenario)
        ? requestedScenario
        : DEMO_SCENARIO_KEYS[Math.floor(Math.random() * DEMO_SCENARIO_KEYS.length)];

      // Simulate a short delay so the loading animation feels real
      await new Promise((resolve) => setTimeout(resolve, 900));

      return res.json({
        success: true,
        mode: 'demo',
        result: DEMO_SCENARIOS[key],
      });
    }

    // ---------- REAL AI MODE ----------
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'NO_IMAGE', message: 'Please upload a waste image to analyze.' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const rawAIText = await callVisionAI(base64Image, req.file.mimetype);
    const parsedResult = safeParseAIResponse(rawAIText);

    if (!parsedResult) {
      return res.status(502).json({
        success: false,
        error: 'AI_PARSE_ERROR',
        message: 'The AI response could not be understood. Please try again with a clearer image.',
      });
    }

    return res.json({ success: true, mode: 'ai', result: parsedResult });
  } catch (err) {
    console.error('Analyze error:', err.message);

    if (err.message === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        error: 'UNSUPPORTED_FILE_TYPE',
        message: 'Unsupported file type. Please upload a JPG, PNG, or WEBP image.',
      });
    }

    if (err.message && err.message.startsWith('AI_API_ERROR')) {
      return res.status(502).json({
        success: false,
        error: 'AI_API_ERROR',
        message: 'The AI service is currently unavailable. Please try again shortly, or use Demo Mode.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Something went wrong while analyzing the image. Please try again.',
    });
  }
});

// ------------------------------------------------------------------
// Multer error handling (file size, etc.)
// ------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'Image is too large. Please upload a file under 10MB.',
      });
    }
    return res.status(400).json({ success: false, error: 'UPLOAD_ERROR', message: err.message });
  }
  if (err) {
    console.error('Unhandled error:', err.message);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Unexpected server error.' });
  }
  next();
});

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n♻️  EcoSort AI backend running on http://localhost:${PORT}`);
  console.log(`   Mode: ${AI_CONFIGURED ? 'AI Analysis Mode (API key detected)' : 'Demo Mode (no API key configured)'}\n`);
});
