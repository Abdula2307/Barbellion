const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function authCheck(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET).id;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const userId = authCheck(req);
  if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

  if (req.method === 'POST') {
    await db.logWorkoutSession(userId, 'day1', 'completed');
    return res.json({ message: 'Day 1 logged.' });
  }

  return res.status(405).json({ message: 'Method not allowed.' });
};
