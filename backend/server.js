/**
 * EcoSort AI - Backend Server
 * -----------------------------------------------------------------
 * Responsibilities:
 *  1. Accept a waste image upload from the frontend.
 *  2. Send the image to Google Gemini Vision for analysis, OR
 *     return a simulated Demo Mode response if no API key is configured
 *     / demo mode is explicitly requested.
 *  3. Parse and validate Gemini's structured JSON response.
 *  4. Return a clean, safe JSON payload to the frontend.
 *
 * The Gemini API key is NEVER exposed to the frontend.
 * It only lives in this server's process and is loaded from .env.
 * -----------------------------------------------------------------
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');

const app = express();

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Whether real AI mode is available
const AI_CONFIGURED = Boolean(
  GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0
);

// Create Gemini client only when API key is available
const ai = AI_CONFIGURED
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    })
  : null;

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------

app.use(cors({ origin: FRONTEND_URL }));

app.use(
  express.json({
    limit: '2mb',
  })
);

// ------------------------------------------------------------------
// Multer
// Store uploaded image in memory only.
// Image is never permanently saved to disk.
// ------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
  },
});

// ------------------------------------------------------------------
// Supported waste categories
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

const SYSTEM_PROMPT = `
You are EcoSort AI, a careful waste-identification and recycling-guidance assistant.

Rules you must follow strictly:

- Analyze ONLY what is visibly present in the image.
- Do not invent details that cannot be seen.
- Identify the single most likely waste item in the image.
- If multiple items are visible, identify the most prominent one and mention the ambiguity in "reason".
- Classify the item into EXACTLY ONE of these categories:

${WASTE_CATEGORIES.join('\n')}

- Never claim 100% certainty.
- Use only "High", "Medium", or "Low" for confidence.
- Confidence must depend on image clarity and identification certainty.
- Give safe and practical disposal guidance.
- Never give dangerous instructions.
- For "E-Waste" or "Hazardous Waste", always recommend checking an authorized local collection/disposal facility.
- Always remind the user in "warning" that local waste-management rules can vary by city or region.
- If the image is unclear, too dark, blurry, or does not show identifiable waste, say so honestly in "reason" and lower your confidence.

The final answer MUST be a JSON object containing exactly these fields:

{
  "item": "string - identified waste item",
  "category": "string - one of the exact waste categories",
  "confidence": "High | Medium | Low",
  "reason": "string - brief explanation",
  "disposal": "string - practical disposal/recycling guidance",
  "sustainability_tip": "string - one short actionable sustainability tip",
  "warning": "string - local rules or other relevant warning"
}
`;

// ------------------------------------------------------------------
// Demo Mode sample data
// Used when:
// 1. No Gemini API key is configured
// 2. Frontend explicitly requests Demo Mode
// ------------------------------------------------------------------

const DEMO_SCENARIOS = {
  plastic_bottle: {
    item: 'Plastic Water Bottle',
    category: 'Recyclable / Dry Waste',
    confidence: 'High',
    reason:
      'The item shows the typical shape, cap, and translucent material of a single-use plastic beverage bottle.',
    disposal:
      'Empty and rinse the bottle, flatten it if possible, and place it in your dry/recyclable waste stream according to local waste-management rules.',
    sustainability_tip:
      'Consider switching to a reusable bottle to reduce single-use plastic waste over time.',
    warning:
      'Local recycling rules may vary — check whether caps should be removed before recycling in your area.',
  },

  banana_peel: {
    item: 'Banana Peel',
    category: 'Organic / Wet Waste',
    confidence: 'High',
    reason:
      'The item shows the characteristic curved shape, color, and texture of a banana peel.',
    disposal:
      'Place the peel in your organic/wet waste or composting bin. Avoid mixing it with dry recyclables.',
    sustainability_tip:
      'Home composting of fruit and vegetable peels can turn kitchen waste into nutrient-rich soil.',
    warning:
      'Composting guidelines can differ between municipalities and community composting programs.',
  },

  aluminum_can: {
    item: 'Aluminum Can',
    category: 'Recyclable / Dry Waste',
    confidence: 'High',
    reason:
      'The item shows the metallic cylindrical shape and ring-pull top typical of an aluminum beverage can.',
    disposal:
      'Rinse out any residue and place the can in your dry/recyclable waste stream. Crushing it can save space.',
    sustainability_tip:
      'Aluminum can be recycled repeatedly without losing quality, making it one of the most valuable materials to recycle.',
    warning:
      'Local waste-management rules may vary regarding whether cans should be crushed before collection.',
  },

  old_smartphone: {
    item: 'Old Smartphone',
    category: 'E-Waste',
    confidence: 'Medium',
    reason:
      'The item shows the rectangular shape, screen, and camera module typical of a smartphone. Exact model cannot be confirmed from the image.',
    disposal:
      'Do not place this in regular household waste. Take it to an authorized e-waste collection center or a manufacturer take-back program.',
    sustainability_tip:
      'Consider donating or trading in working phones — refurbishment extends the useful life of electronic devices and reduces e-waste.',
    warning:
      'E-waste often contains hazardous materials; always use authorized local e-waste collection facilities.',
  },

  used_tissue: {
    item: 'Used Tissue Paper',
    category: 'General / Non-Recyclable Waste',
    confidence: 'Medium',
    reason:
      'The item shows crumpled, soft paper consistent with used tissue, which is typically contaminated and not recyclable.',
    disposal:
      'Dispose of used tissues in general waste. They are usually not accepted in paper recycling due to contamination.',
    sustainability_tip:
      'Where possible, use reusable cloth alternatives for non-medical purposes to reduce daily paper waste.',
    warning:
      'Some municipal composting programs may accept unbleached, uncontaminated tissue — check local guidelines.',
  },
};

const DEMO_SCENARIO_KEYS = Object.keys(DEMO_SCENARIOS);

// ------------------------------------------------------------------
// Helper: safely parse Gemini JSON response
// ------------------------------------------------------------------

function safeParseAIResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  let cleaned = rawText.trim();

  // Remove markdown code fences if Gemini returns them
  cleaned = cleaned
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  // Extract first JSON object if any extra text exists
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace < firstBrace
  ) {
    return null;
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(cleaned);

    return validateAIResult(parsed);
  } catch (err) {
    return null;
  }
}

// ------------------------------------------------------------------
// Helper: validate AI result
// ------------------------------------------------------------------

function validateAIResult(obj) {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  const required = [
    'item',
    'category',
    'confidence',
    'reason',
    'disposal',
    'sustainability_tip',
  ];

  for (const field of required) {
    if (
      typeof obj[field] !== 'string' ||
      obj[field].trim() === ''
    ) {
      return null;
    }
  }

  // Match category against our supported categories
  const matchedCategory = WASTE_CATEGORIES.find(
    (category) =>
      category.toLowerCase() ===
      String(obj.category).toLowerCase()
  );

  return {
    item: obj.item.trim(),

    category:
      matchedCategory || obj.category.trim(),

    confidence: [
      'High',
      'Medium',
      'Low',
    ].includes(obj.confidence)
      ? obj.confidence
      : 'Medium',

    reason: obj.reason.trim(),

    disposal: obj.disposal.trim(),

    sustainability_tip:
      obj.sustainability_tip.trim(),

    warning:
      typeof obj.warning === 'string'
        ? obj.warning.trim()
        : 'Local waste-management rules may vary.',
  };
}

// ------------------------------------------------------------------
// Helper: Call Google Gemini Vision API
// ------------------------------------------------------------------

async function callVisionAI(base64Image, mimeType) {
  if (!ai) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,

    contents: [
      {
        role: 'user',

        parts: [
          {
            text: `
${SYSTEM_PROMPT}

Now analyze the uploaded waste image.

Return ONLY the JSON object.
Do not return markdown.
Do not return code fences.
Do not return any explanation outside the JSON object.
`,
          },

          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],

    config: {
      temperature: 0.2,

      maxOutputTokens: 500,

      responseMimeType: 'application/json',

      responseSchema: {
        type: 'object',

        properties: {
          item: {
            type: 'string',
            description: 'The identified waste item.',
          },

          category: {
            type: 'string',
            enum: WASTE_CATEGORIES,
            description:
              'Exactly one supported EcoSort waste category.',
          },

          confidence: {
            type: 'string',
            enum: ['High', 'Medium', 'Low'],
            description:
              'Confidence based on image clarity.',
          },

          reason: {
            type: 'string',
            description:
              'Brief explanation for the classification.',
          },

          disposal: {
            type: 'string',
            description:
              'Safe practical disposal guidance.',
          },

          sustainability_tip: {
            type: 'string',
            description:
              'One short actionable sustainability tip.',
          },

          warning: {
            type: 'string',
            description:
              'Warning about local waste-management rules.',
          },
        },

        required: [
          'item',
          'category',
          'confidence',
          'reason',
          'disposal',
          'sustainability_tip',
          'warning',
        ],
      },
    },
  });

  const content = response?.text;

  if (!content) {
    throw new Error('GEMINI_EMPTY_RESPONSE');
  }

  return content;
}

// ------------------------------------------------------------------
// Route: Health Check
// ------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',

    aiConfigured: AI_CONFIGURED,

    mode: AI_CONFIGURED
      ? 'AI Analysis Mode'
      : 'Demo Mode',

    provider: AI_CONFIGURED
      ? 'Google Gemini'
      : 'Demo',
  });
});

// ------------------------------------------------------------------
// Route: Analyze Waste Image
// ------------------------------------------------------------------

app.post(
  '/api/analyze',
  upload.single('image'),
  async (req, res) => {
    try {
      const forceDemo =
        req.body?.demoMode === 'true' ||
        req.query?.demoMode === 'true';

      // --------------------------------------------------------------
      // DEMO MODE
      // --------------------------------------------------------------

      if (!AI_CONFIGURED || forceDemo) {
        const requestedScenario =
          req.body?.scenario;

        const key = DEMO_SCENARIO_KEYS.includes(
          requestedScenario
        )
          ? requestedScenario
          : DEMO_SCENARIO_KEYS[
              Math.floor(
                Math.random() *
                  DEMO_SCENARIO_KEYS.length
              )
            ];

        // Small delay to simulate AI processing
        await new Promise((resolve) =>
          setTimeout(resolve, 900)
        );

        return res.json({
          success: true,
          mode: 'demo',
          result: DEMO_SCENARIOS[key],
        });
      }

      // --------------------------------------------------------------
      // REAL GEMINI AI MODE
      // --------------------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NO_IMAGE',
          message:
            'Please upload a waste image to analyze.',
        });
      }

      // Convert image buffer to base64
      const base64Image =
        req.file.buffer.toString('base64');

      // Send image to Gemini
      const rawAIText = await callVisionAI(
        base64Image,
        req.file.mimetype
      );

      // Parse Gemini JSON
      const parsedResult =
        safeParseAIResponse(rawAIText);

      if (!parsedResult) {
        console.error(
          'Gemini returned invalid JSON:',
          rawAIText
        );

        return res.status(502).json({
          success: false,
          error: 'AI_PARSE_ERROR',
          message:
            'The AI response could not be understood. Please try again with a clearer image.',
        });
      }

      // Return result to frontend
      return res.json({
        success: true,
        mode: 'ai',
        result: parsedResult,
      });
    } catch (err) {
      console.error(
        'Analyze error:',
        err.message
      );

      // --------------------------------------------------------------
      // Unsupported file type
      // --------------------------------------------------------------

      if (
        err.message ===
        'UNSUPPORTED_FILE_TYPE'
      ) {
        return res.status(400).json({
          success: false,
          error: 'UNSUPPORTED_FILE_TYPE',
          message:
            'Unsupported file type. Please upload a JPG, PNG, or WEBP image.',
        });
      }

      // --------------------------------------------------------------
      // Gemini API errors
      // --------------------------------------------------------------

      if (
        err.message ===
          'GEMINI_NOT_CONFIGURED' ||
        err.message ===
          'GEMINI_EMPTY_RESPONSE'
      ) {
        return res.status(502).json({
          success: false,
          error: 'GEMINI_API_ERROR',
          message:
            'Gemini AI is not configured correctly. Please check the API key and server configuration.',
        });
      }

      // --------------------------------------------------------------
      // Rate limit / authentication / API errors
      // --------------------------------------------------------------

      if (
        err.status === 401 ||
        err.status === 403 ||
        err.status === 429 ||
        err.status >= 500
      ) {
        console.error(
          'Gemini API error:',
          err
        );

        return res.status(502).json({
          success: false,
          error: 'GEMINI_API_ERROR',
          message:
            'The Gemini AI service is currently unavailable or the API limit has been reached. Please try again later or use Demo Mode.',
        });
      }

      // --------------------------------------------------------------
      // Generic error
      // --------------------------------------------------------------

      return res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message:
          'Something went wrong while analyzing the image. Please try again.',
      });
    }
  }
);

// ------------------------------------------------------------------
// Multer error handling
// ------------------------------------------------------------------

app.use(
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (
        err.code === 'LIMIT_FILE_SIZE'
      ) {
        return res.status(400).json({
          success: false,
          error: 'FILE_TOO_LARGE',
          message:
            'Image is too large. Please upload a file under 10MB.',
        });
      }

      return res.status(400).json({
        success: false,
        error: 'UPLOAD_ERROR',
        message: err.message,
      });
    }

    if (err) {
      console.error(
        'Unhandled error:',
        err.message
      );

      return res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message:
          'Unexpected server error.',
      });
    }

    next();
  }
);

// ------------------------------------------------------------------
// Start Server
// ------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `\n♻️ EcoSort AI backend running on http://localhost:${PORT}`
  );

  console.log(
    `   AI Provider: Google Gemini`
  );

  console.log(
    `   Model: ${GEMINI_MODEL}`
  );

  console.log(
    `   Mode: ${
      AI_CONFIGURED
        ? 'AI Analysis Mode (Gemini API key detected)'
        : 'Demo Mode (no Gemini API key configured)'
    }\n`
  );
});