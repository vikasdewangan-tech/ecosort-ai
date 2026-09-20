# PROJECT DOCUMENTATION

## 1. Project Title
**EcoSort AI — AI-Powered Waste Segregation & Recycling Assistant**
*Tagline: Turn Waste Into the Right Choice.*

## 2. Abstract
EcoSort AI is a web-based application that uses an AI vision model to help users correctly identify and segregate waste. A user uploads a photo of a waste item, and the system identifies the item, classifies it into one of five standard waste categories, and provides clear, practical disposal guidance along with a sustainability tip. The project directly supports **SDG 12 (Responsible Consumption and Production)** and, by encouraging cleaner community waste practices, also supports **SDG 11 (Sustainable Cities and Communities)**. The application includes a fully functional **Demo Mode** so it can always be presented even without live API access, alongside a real **AI Analysis Mode** for genuine image-based classification.

## 3. Problem Statement
Many people — especially in shared spaces like hostels, schools, and apartment complexes — are unsure which bin a given waste item belongs in. This uncertainty leads to mixed waste streams, which reduces the effectiveness of recycling programs and increases the volume of waste sent to landfills.

## 4. Background
Waste segregation at the source is one of the most effective and low-cost ways to improve recycling outcomes. However, segregation guidelines (recyclable, organic, e-waste, hazardous, general) are not always intuitive, and awareness varies widely across households and institutions.

## 5. Why the Problem Matters
- Mixed waste is harder and more expensive to process.
- Recyclable materials sent to landfill represent a lost resource.
- Hazardous and e-waste mixed into general waste can create environmental and health risks.
- Small, repeated individual decisions (what bin to use) add up to a large collective impact.

## 6. Target Users
- College and university students
- Hostel residents
- Households
- Schools
- Community and residential associations
- Environment-conscious individuals

## 7. SDG Alignment
- **Primary — SDG 12: Responsible Consumption and Production.** EcoSort AI directly supports target 12.5 (substantially reduce waste generation through prevention, reduction, recycling and reuse) by helping users route waste to the correct stream.
- **Secondary — SDG 11: Sustainable Cities and Communities.** Better household-level segregation contributes to cleaner, more sustainably managed communities.

## 8. Proposed Solution
A simple, accessible web application where a user uploads a photo of a waste item and instantly receives:
1. The identified item
2. Its waste category
3. A confidence level
4. Practical disposal/recycling guidance
5. A sustainability tip
6. A note on verifying local rules where needed

## 9. Why AI Is Needed
Rule-based or manual lookup systems cannot handle the visual variety of real-world waste items. An AI vision model can generalize across many object types, lighting conditions, and item variations, providing a flexible identification layer that a static database cannot.

## 10. AI Workflow
```
Waste Image → AI Vision Analysis → Item Identification → Waste Classification → Disposal Guidance → Sustainability Tip
```
The backend sends the uploaded image, together with a strict system prompt, to a vision-capable AI API. The AI returns a structured JSON object which the backend validates before sending it to the frontend.

## 11. System Architecture
```
User
 ↓
Frontend (HTML/CSS/JS)
 ↓
Backend API (Node.js + Express)
 ↓
AI Vision Model/API (OpenAI-compatible)
 ↓
Structured JSON Response
 ↓
Backend (validation + safe fallback)
 ↓
Frontend (Result Card)
```

## 12. Features
- Drag-and-drop and click-to-upload image analyzer
- Live image preview with file name/size and remove/change options
- Real AI Analysis Mode and a clearly labeled Demo Mode
- Structured, validated results (item, category, confidence, disposal guidance, tip, warning)
- Waste category reference cards
- "How It Works" 5-step visual explainer
- Sustainability impact section
- Responsible AI section with limitations
- Dark mode with persisted preference
- Fully responsive design (desktop, tablet, mobile)
- Friendly error handling for all failure cases

## 13. Design Thinking

**Empathize** — Understand confusion around waste segregation faced by students, households, and communities.

**Define** — Users need a simple way to understand how a given piece of waste should be categorized and disposed of correctly.

**Ideate** — Use AI-powered image analysis to identify the waste item and generate category-specific guidance, rather than requiring users to memorize rules.

**Prototype** — Build EcoSort AI as a web-based assistant with a real AI backend and a Demo Mode for reliable presentation.

**Test & Refine** — Test the system against a range of common waste images (plastic, organic, e-waste, hazardous, general), review AI responses for accuracy and safety, and refine the system prompt and UI based on results.

## 14. Responsible AI
- **Privacy** — Uploaded images are processed in memory only and are not stored on disk.
- **Fairness** — Recognition accuracy can vary depending on image quality, lighting, and item type.
- **Transparency** — Every result is presented with a confidence level (High/Medium/Low) and is framed as a recommendation, not a guaranteed fact.
- **Human Oversight** — Users are advised to double-check uncertain, hazardous, or e-waste results with local waste-management authorities before acting.

## 15. Testing
| Input             | Expected Category               |
|-------------------|----------------------------------|
| Plastic bottle    | Recyclable / Dry Waste           |
| Banana peel       | Organic / Wet Waste              |
| Old mobile phone  | E-Waste                          |
| Aluminum can      | Recyclable / Dry Waste           |
| Used tissue       | General / Non-Recyclable Waste   |

Additional edge cases tested:
- No image selected → friendly validation message, Analyze button disabled
- Unsupported file type → rejected with a clear message
- Oversized image (>10MB) → rejected with a clear message
- AI/API failure or timeout → graceful error message, option to retry or use Demo Mode
- Poor-quality/unclear image → AI instructed to lower confidence and explain uncertainty
- Multiple objects in frame → AI instructed to identify the most prominent item and note ambiguity
- Hazardous item → AI instructed to recommend authorized local disposal facilities

## 16. Limitations
- Similar-looking materials (e.g. different plastics) may be difficult to distinguish visually.
- Poor image quality, poor lighting, or blur can reduce accuracy.
- Multiple objects in a single photo can create ambiguity in identification.
- Waste-management rules differ by city/region and are not covered by the AI itself.
- AI predictions can occasionally be incorrect and should not be solely relied upon for hazardous materials.

## 17. Expected Impact
By making it easier and faster to understand how to segregate waste correctly, EcoSort AI aims to:
- Improve individual awareness of waste categories.
- Encourage more accurate segregation at the source.
- Support better downstream recycling outcomes.
- Contribute, in a small way, to cleaner and more sustainably managed communities.

*(No specific quantitative impact percentages are claimed, as this is a prototype and has not been evaluated at scale.)*

## 18. Future Scope
- Detecting and classifying multiple items in a single image.
- Location-aware guidance reflecting specific city/municipality recycling rules.
- A history/dashboard view of previously analyzed items for a household or hostel.
- A lightweight, offline-capable model for low-connectivity environments.
- Multilingual support (e.g. Hindi) to widen accessibility.

## 19. Technologies Used
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js, Multer (in-memory file handling), dotenv
- **AI:** OpenAI-compatible vision API (e.g. GPT-4o-mini vision), called securely from the backend only

## 20. Installation
See `README.md` for full step-by-step setup instructions, including backend dependency installation, environment variable configuration, and running both frontend and backend locally.

## 21. Usage
1. Open the EcoSort AI website.
2. Upload or drag-and-drop a photo of a waste item.
3. Click **Analyze Waste**.
4. View the detected item, category, confidence, disposal guidance, and sustainability tip.
5. Follow the recommended action, verifying local rules for hazardous or uncertain cases.

## 22. Conclusion
EcoSort AI demonstrates how a focused, responsibly-designed AI application can help address a small but meaningful part of a large sustainability challenge — waste segregation. By combining a genuine AI vision workflow with a clear, honest presentation of its limitations, the project shows both technical competence and an understanding of what it means to build AI responsibly, in direct support of SDG 12 and SDG 11.
