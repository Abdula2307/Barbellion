const jwt = require('jsonwebtoken');
const db = require('../db');
const { calculateBaselineCalories, calculateWaterTarget } = require('../helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

function authCheck(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET).userId;
  } catch {
    return null;
  }
}

// `history` is a short list of { role: 'user'|'assistant', content } from THIS browser
// session only — never written to MongoDB, so it costs nothing in storage and disappears
// the moment the tab/session ends.
async function parseNutritionText(userText, history = []) {
  const systemInstruction = `You are a friendly, casual nutrition and training coach texting with a calisthenics athlete. Respond with ONLY valid JSON, no markdown, no extra text:
{ "type": "food" | "water" | "chat", "value": integer or null, "reply": "reply text" }

STEP 1 — decide the type by intent, not just keywords:
- "food": the user is STATING that THEY THEMSELVES already ate/are eating something right now (e.g. "I ate 5 eggs", "just had a shake"). Log it.
- "water": the user is STATING that THEY THEMSELVES already drank something (e.g. "drank 2 glasses", "1 litre water"). Log it.
- "chat": anything else — questions, advice-seeking, opinions, small talk, or statements about someone ELSE (e.g. "my friend ate 20 eggs, is that good?", "should I eat 20 eggs?", "is peanut butter good for bulking?"). Do NOT log for chat: set value to null.
Only log food/water when the user is clearly reporting their OWN consumption as a completed fact. Anything about a third person, or phrased as a question/hypothetical, is "chat" — never log it.

STEP 2 — value rules (only when type is food or water):
- water: milliliters. Convert: 1 litre = 1000, 1 glass = 250, 1 cup = 240, 1 bottle = 500 (unless a specific size is given).
- food: total estimated calories (kcal) — never raw grams of a macro. Use standard nutrition knowledge (1 large egg ≈ 70 kcal, 1g protein/carbs ≈ 4 kcal, 1g fat ≈ 9 kcal).
- value is always a plain integer. If type is "chat", value must be null.

STEP 3 — the "reply" field:
- For "food"/"water": short, casual, 1-2 lines, can end with a light natural follow-up.
- For "chat": answer ONLY what was asked. Be short and direct — a yes/no question gets a yes/no plus one short reason, max 2 lines. Do NOT add unsolicited offers like "want me to build you a routine?" or "need any tips?". The answer ends the turn — no extra coaching questions tacked on.
- Use the recent conversation (provided as prior turns) to resolve follow-ups like "what about me?" or "should I do that too?" that refer back to something just discussed.`;

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history,
    { role: 'user', content: userText },
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  const cleaned = data.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = async (req, res) => {
  const userId = authCheck(req);
  if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

  const { action } = req.query;

  try {
    if (action === 'log' && req.method === 'POST') {
      const { text, history } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: 'Text required.' });

      const user = await db.findUserById(userId);
      if (!user.current_weight || !user.height) {
        return res.status(400).json({ message: 'Complete your profile first.', needsOnboarding: true });
      }

      // Keep it short — just enough for the model to resolve a follow-up, not a transcript.
      const safeHistory = Array.isArray(history) ? history.slice(-8) : [];

      const parsed = await parseNutritionText(text, safeHistory);
      if (parsed.type === 'food' || parsed.type === 'water') {
        await db.addNutritionLog(userId, parsed.type, parsed.value, text);
      }

      const totals = await db.getTodayTotals(userId);
      const calorieTarget = calculateBaselineCalories(user.current_weight, user.height, user.age);
      const waterTarget = calculateWaterTarget(user.current_weight, user.height);

      return res.json({
        parsed, reply: parsed.reply,
        logged: parsed.type === 'food' || parsed.type === 'water',
        caloriesLeft: Math.max(calorieTarget - totals.food, 0),
        waterLeft: Math.max(waterTarget - totals.water, 0),
        calorieTarget, waterTarget,
      });
    }

    if (action === 'status' && req.method === 'GET') {
      const user = await db.findUserById(userId);
      if (!user.current_weight || !user.height) {
        return res.status(400).json({ message: 'Complete your profile first.', needsOnboarding: true });
      }

      const totals = await db.getTodayTotals(userId);
      const calorieTarget = calculateBaselineCalories(user.current_weight, user.height, user.age);
      const waterTarget = calculateWaterTarget(user.current_weight, user.height);

      return res.json({
        caloriesLeft: Math.max(calorieTarget - totals.food, 0),
        waterLeft: Math.max(waterTarget - totals.water, 0),
        calorieTarget, waterTarget,
      });
    }

    return res.status(400).json({ message: 'Unknown action.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Failed.' });
  }
};
