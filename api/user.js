const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const COUNTRY_TIMEZONES = {
  'Pakistan': 'Asia/Karachi', 'India': 'Asia/Kolkata', 'United States': 'America/New_York',
  'United Kingdom': 'Europe/London', 'Canada': 'America/Toronto', 'Australia': 'Australia/Sydney',
  'UAE': 'Asia/Dubai', 'Saudi Arabia': 'Asia/Riyadh', 'Germany': 'Europe/Berlin', 'France': 'Europe/Paris',
};

function getWeekdayForCountry(country) {
  const tz = COUNTRY_TIMEZONES[country] || 'UTC';
  return new Date().toLocaleString('en-US', { timeZone: tz, weekday: 'long' });
}

function getWorkoutForWeekday(weekday) {
  if (['Monday', 'Wednesday', 'Friday'].includes(weekday)) return { day: 'day1', label: 'Day 1: Hypertrophy' };
  if (['Tuesday', 'Thursday', 'Saturday'].includes(weekday)) return { day: 'day2', label: 'Day 2: Skills' };
  return { day: 'rest', label: 'Rest Day' };
}

function authCheck(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET).userId;
  } catch {
    return null;
  }
}

function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}

module.exports = async (req, res) => {
  const userId = authCheck(req);
  if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

  const { action } = req.query;

  try {
    if (action === 'onboarding' && req.method === 'POST') {
      const { current_weight, height } = req.body;
      if (!current_weight || !height) return res.status(400).json({ message: 'Weight and height required.' });
      await db.completeOnboarding(userId, current_weight, height);
      const user = await db.findUserById(userId);
      return res.json({ message: 'Onboarding complete.', user: sanitize(user) });
    }

    if (action === 'me' && req.method === 'GET') {
      const user = await db.findUserById(userId);
      return res.json({ user: sanitize(user) });
    }

    if (action === 'today-workout' && req.method === 'GET') {
      const user = await db.findUserById(userId);
      const weekday = getWeekdayForCountry(user.country);
      const result = getWorkoutForWeekday(weekday);
      let completedToday = false;
      if (result.day !== 'rest') completedToday = await db.isWorkoutCompletedToday(userId, result.day);
      return res.json({ weekday, ...result, completedToday });
    }

    if (action === 'weight-check-status' && req.method === 'GET') {
      const user = await db.findUserById(userId);
      if (!user.last_weight_check) return res.json({ due: false });
      const daysSince = (new Date() - new Date(user.last_weight_check)) / (1000 * 60 * 60 * 24);
      return res.json({ due: daysSince >= 7 });
    }

    if (action === 'weight-check' && req.method === 'POST') {
      const { weight, height } = req.body;
      if (!weight) return res.status(400).json({ message: 'Weight required.' });
      await db.updateWeightCheck(userId, weight, height);
      return res.json({ message: 'Updated.' });
    }

    return res.status(400).json({ message: 'Unknown action.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
