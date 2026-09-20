# ♻️ EcoSort AI

### Turn Waste Into the Right Choice.

**EcoSort AI — AI-Powered Waste Segregation & Recycling Assistant**

Built for the **1M1B AI for Sustainability Virtual Internship** (in collaboration with **IBM SkillsBuild & AICTE**).

---

## 📌 Problem

Improper waste segregation is a common problem in homes, hostels, campuses, and communities. People often don't know whether an item is recyclable/dry waste, organic/wet waste, e-waste, hazardous waste, or general waste. Incorrect segregation reduces recycling effectiveness and increases mixed waste going to landfills.

## 💡 Solution

EcoSort AI lets a user upload a photo of a waste item. An AI vision model analyzes the image, identifies the item, classifies it into one of five waste categories, and returns practical disposal guidance along with a sustainability tip — all through a clean, modern web interface.

**Flow:** `Waste Image → AI Vision Analysis → Item Identification → Waste Classification → Disposal Guidance → Sustainability Tip`

## 🌍 SDG Alignment

- **Primary: SDG 12** — Responsible Consumption and Production
- **Secondary: SDG 11** — Sustainable Cities and Communities

## ✨ Features

- 📷 Drag-and-drop / click-to-upload image analyzer with live preview
- 🤖 Real AI vision analysis via an OpenAI-compatible vision API (backend-only key)
- 🧪 **Demo Mode** — fully functional simulated responses when no API key is configured, so the project can always be demoed
- 📊 Structured, validated AI output (item, category, confidence, disposal guidance, sustainability tip, warning)
- 🎨 Modern, premium, responsive UI (desktop, tablet, mobile) with dark mode
- 🔒 API key protection — key lives only on the backend, never in frontend code
- ⚠️ Friendly error handling for bad files, network failures, and AI/API errors
- ♿ Responsible AI section covering privacy, fairness, transparency, and limitations

## 🖼️ Screenshots

> _Add your own screenshots here after running the project locally:_
> - `docs/screenshot-hero.png` — Hero section
> - `docs/screenshot-analyzer.png` — Upload + result card
> - `docs/screenshot-mobile.png` — Mobile responsive view

## 🛠️ Tech Stack

| Layer     | Technology                          |
|-----------|--------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript      |
| Backend   | Node.js, Express.js                  |
| AI        | OpenAI-compatible vision API (e.g. GPT-4o-mini vision) |
| Uploads   | Multer (in-memory, never saved to disk) |

No React, TypeScript, Docker, or a database is used — kept intentionally simple and easy to understand for a student project.

## 🏗️ Architecture

```
User
 ↓
Frontend (HTML/CSS/JS)
 ↓  fetch() → multipart/form-data
Backend API (Express - /api/analyze)
 ↓  HTTPS request with image (base64) + system prompt
AI Vision Model/API (OpenAI-compatible)
 ↓  structured JSON response
Backend (parses + validates JSON, applies safety fallback)
 ↓  clean JSON
Frontend (renders premium result card)
```

## 📂 Project Structure

```
ecosort-ai/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── README.md
├── PROJECT_DOCUMENTATION.md
├── .gitignore
└── package.json
```

## ⚙️ Setup Instructions

### 1. Clone / open the project folder

```bash
cd ecosort-ai
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your own API key:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
AI_API_KEY=your_openai_or_compatible_api_key_here
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
PORT=5000
FRONTEND_URL=http://localhost:3000
```

> If you leave `AI_API_KEY` empty, the app automatically runs in **Demo Mode** with simulated results — perfect for a live demo without any API cost or risk.

### 4. Run the backend

```bash
npm start
```

The backend runs at `http://localhost:5000`.

### 5. Run the frontend

In a separate terminal, from the project root:

```bash
npx serve frontend -l 3000
```

(or simply open `frontend/index.html` directly in a browser — for full functionality with the backend, serving it is recommended).

Visit `http://localhost:3000`.

## 🧪 Demo Mode vs 🤖 AI Analysis Mode

- **Demo Mode** — active automatically when no `AI_API_KEY` is set. Returns realistic, pre-written sample results (plastic bottle, banana peel, aluminum can, old smartphone, used tissue) so the app is always demoable. Clearly labeled **"Demo Mode — Simulated AI Output"** in the UI.
- **AI Analysis Mode** — active automatically once a valid `AI_API_KEY` is configured. Sends the uploaded image to the configured vision API and returns a real analysis.

The current mode is always shown at the top of the Analyzer section.

## 🔐 Environment Variables

| Variable        | Description                                             |
|-----------------|-----------------------------------------------------------|
| `AI_API_KEY`    | Your AI vision API key (kept server-side only)            |
| `AI_API_URL`    | The AI provider's chat completions endpoint                |
| `AI_MODEL`      | The vision-capable model name                              |
| `PORT`          | Port for the backend server                                 |
| `FRONTEND_URL`  | Allowed frontend origin for CORS                             |

## ⚖️ Responsible AI

EcoSort AI is built with responsible AI principles:

- **Privacy** — images are processed in memory and are not stored on disk.
- **Fairness** — accuracy can vary across lighting, angles, and image quality.
- **Transparency** — every result includes a confidence level and is presented as a recommendation, not a certainty.
- **Human oversight** — users are encouraged to verify uncertain, hazardous, or e-waste classifications with local authorities.

## ⚠️ Limitations

- Similar-looking materials may be difficult to distinguish.
- Poor image quality can reduce accuracy.
- Multiple objects in one photo can create ambiguity.
- Local waste-management rules vary by city/region and are not covered by the AI.
- AI predictions may occasionally be incorrect and should not be the sole basis for handling hazardous waste.

## 🚀 Future Scope

- Multi-item detection in a single image
- Location-aware disposal guidance (city-specific recycling rules)
- History/dashboard of previously analyzed items
- Offline-capable lightweight on-device model
- Multilingual support (e.g. Hindi) for wider accessibility

## 📄 License

MIT — built as an academic internship project.
