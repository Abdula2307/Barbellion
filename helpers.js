// ---- Calorie calc ----
function calculateBaselineCalories(weightKg, heightCm) {
  const age = 25;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  return Math.round(bmr * 1.55);
}

function calculateWaterTarget(weightKg) {
  return Math.round(weightKg * 35 + 500);
}

// ---- Skill tree (Day 2) ----
const STEPS = {
  1: { folder: 1, label: 'The L-Sit Foundation', training: 'Ground L-Sit Hold (Goal: Accumulated 1 Minute)', question: 'Did you achieve the 1-minute L-Sit hold today?', warmupAdd: 'L-Sit Hold (1 min)' },
  2: { folder: 1, label: 'The Vertical Balance Era', training: 'Forearm Handstand & Wall Handstand Practice', question: 'Did you achieve a stable 1-minute freestanding Handstand today?', warmupAdd: 'Handstand Hold (1 min)' },
  3: { folder: 1, label: 'The Press Link', training: 'L-Sit to Handstand Press Transitions', question: 'Did you achieve a clean, dynamic L-Sit to Handstand Press today?', warmupAdd: 'L-Sit to Handstand Press' },
  4: { folder: 1, label: 'The Planche Entry (Frog Pose)', training: 'Frog Pose / Crow Stand', question: 'Did you achieve a solid Frog Pose balance today?', warmupAdd: 'Frog Pose Hold' },
  5: { folder: 1, label: 'Single-Leg Planche', training: 'Single-Leg Planche', question: 'Did you achieve the Single-Leg Planche hold today?', warmupAdd: 'Single-Leg Planche Hold' },
  6: { folder: 1, label: 'Full Planche Mastery', training: 'Full Planche Hold (Goal: 5 seconds)', question: 'Did you achieve a perfect 5-second Full Planche today?', warmupAdd: null, completesFolder: 1 },
  7: { folder: 2, label: 'Passive & Active Hang Conditioning', training: 'Scapular Pull-ups & Dead Hangs', question: 'Did you achieve the 1.5-minute continuous dead hang today?', warmupAdd: 'Dead Hang (1 min)' },
  8: { folder: 2, label: 'The High Chest-to-Bar Pull-up', training: 'Strict Chest-to-Bar Pull-ups (10 reps)', question: 'Did you achieve 10 clean strict chest-to-bar pull-ups today?', warmupAdd: '5 Chest-to-Bar Pull-ups' },
  9: { folder: 2, label: 'Explosive Belly-Button Pulls', training: 'High Explosive Pull-ups', question: 'Did you achieve 3 consecutive belly-button explosive pull-ups today?', warmupAdd: '3 Explosive Pull-ups' },
  10: { folder: 2, label: 'The Jumping & Negative Muscle-Up', training: 'Jump into muscle-up + slow negative', question: 'Did you control 5 ultra-slow muscle-up negatives today?', warmupAdd: '3 Controlled Negatives' },
  11: { folder: 2, label: 'Above the Bar Control', training: 'Strict, slow Bar Muscle-Ups', question: 'Did you achieve 5 strict, consecutive Bar Muscle-Ups today?', warmupAdd: '2 Strict Muscle-Ups' },
  12: { folder: 2, label: 'Front Lever Core Compression', training: 'Tuck Front Lever Hold', question: 'Did you hold a clean Tuck Front Lever for 20 seconds today?', warmupAdd: '10s Tuck Lever Hold' },
  13: { folder: 2, label: 'Advanced Tuck Front Lever', training: 'Advanced Tuck Front Lever Hold', question: 'Did you achieve a flat-back Advanced Tuck hold for 15 seconds today?', warmupAdd: '10s Advanced Tuck Hold' },
  14: { folder: 2, label: 'Single-Leg Front Lever', training: 'Single-Leg Front Lever Hold', question: 'Did you achieve a clean 10-second Single-Leg Front Lever today?', warmupAdd: 'Single-Leg Lever Holds' },
  15: { folder: 2, label: 'Full Front Lever Mastery', training: 'Full Front Lever Hold (5 seconds)', question: 'Did you achieve a perfect 5-second Full Front Lever today?', warmupAdd: null, completesFolder: 2 },
  16: { folder: 3, label: 'GOD-MODE ROUTINE', training: 'Master Pushing Flow (20) + Master Pulling Flow (20)', question: 'Did you complete all 20 Pushing and 20 Pulling Loops today?', warmupAdd: null, isMaintenance: true },
};

function getStepData(step) { return STEPS[step] || STEPS[16]; }
function getWarmups(step) {
  const warmups = [];
  for (let i = 1; i < step; i++) if (STEPS[i]?.warmupAdd) warmups.push(STEPS[i].warmupAdd);
  return warmups;
}
function advanceStep(current, passed) {
  const step = getStepData(current);
  if (step.isMaintenance) return current;
  return passed ? current + 1 : current;
}

module.exports = { calculateBaselineCalories, calculateWaterTarget, getStepData, getWarmups, advanceStep };
