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

async function parseNutritionText(userText) {
  const systemInstruction = `You are a friendly, casual nutrition coach texting with a calisthenics athlete. Respond with ONLY valid JSON: { "type": "food" | "water", "value": integer, "reply": "short 2-3 line human reply ending with a casual follow-up question" }. No markdown, no extra text.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userText }],
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
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: 'Text required.' });

      const user = await db.findUserById(userId);
      if (!user.current_weight || !user.height) {
        return res.status(400).json({ message: 'Complete your profile first.', needsOnboarding: true });
      }

      const parsed = await parseNutritionText(text);
      await db.addNutritionLog(userId, parsed.type, parsed.value, text);

      const totals = await db.getTodayTotals(userId);
      const calorieTarget = calculateBaselineCalories(user.current_weight, user.height);
      const waterTarget = calculateWaterTarget(user.current_weight);

      return res.json({
        parsed, reply: parsed.reply,
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
      const calorieTarget = calculateBaselineCalories(user.current_weight, user.height);
      const waterTarget = calculateWaterTarget(user.current_weight);

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
