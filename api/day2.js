const jwt = require('jsonwebtoken');
const db = require('../db');
const { getStepData, getWarmups, advanceStep } = require('../helpers');

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

  const { action } = req.query;

  try {
    if (action === 'state' && req.method === 'GET') {
      const user = await db.findUserById(userId);
      const step = user.current_skill_step || 1;
      const stepData = getStepData(step);
      const warmups = getWarmups(step);

      return res.json({
        currentStep: step, folder: stepData.folder, label: stepData.label,
        training: stepData.training, question: stepData.question,
        warmups, isMaintenance: !!stepData.isMaintenance,
      });
    }

    if (action === 'gatekeeper' && req.method === 'POST') {
      const { passed } = req.body;
      if (typeof passed !== 'boolean') return res.status(400).json({ message: 'passed required.' });

      const user = await db.findUserById(userId);
      const currentStep = user.current_skill_step || 1;
      const newStep = advanceStep(currentStep, passed);

      await db.updateSkillStep(userId, newStep);
      await db.logWorkoutSession(userId, 'day2', passed ? 'leveled_up' : 'locked_in');

      return res.json({ leveledUp: passed && newStep !== currentStep, newStep });
    }

    return res.status(400).json({ message: 'Unknown action.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
