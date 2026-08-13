// ---- Calorie calc ----
function calculateBaselineCalories(weightKg, heightCm) {
  const age = 25;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  return Math.round(bmr * 1.55);
}

function calculateWaterTarget(weightKg) {
  return Math.round(weightKg * 35 + 500);
}

// ---- Skill tree (Day 2) — single unified track, 16 levels ----
// type: 'hold' (simple timed hold) | 'reps' (rep target) | 'flow' (final maintenance level)
// untested skills get a 20-min attempt window + Done button + Y/N gatekeeper.
// mastered skills (already passed) become part of the warmup with a short auto-timer.

const STEPS = {
  1:  { label: 'L-Sit Hold', type: 'hold', target: '1 minute', targetSeconds: 60,
        question: 'Did you achieve the 1-minute L-Sit hold today?', video: 'level-1-l-sit.mp4' },
  2:  { label: 'Crow Pose', type: 'hold', target: '1 minute', targetSeconds: 60,
        question: 'Did you achieve the 1-minute Crow Pose today?', video: 'level-2-crow-pose.mp4' },
  3:  { label: 'Wall-Assisted Handstand', type: 'hold', target: '1 minute', targetSeconds: 60,
        question: 'Did you achieve the 1-minute Wall-Assisted Handstand today?', video: 'level-3-wall-handstand.mp4' },
  4:  { label: 'Freestanding Handstand', type: 'hold', target: '1 minute', targetSeconds: 60,
        question: 'Did you achieve a stable 1-minute freestanding Handstand today?', video: 'level-4-freestanding-handstand.mp4' },
  5:  { label: 'L-Sit to Handstand Press', type: 'reps', target: 'a clean transition',
        question: 'Did you achieve a clean L-Sit to Handstand Press today?',
        unlocksFlow: 'flowA', video: 'level-5-lsit-to-handstand-press.mp4' },
  6:  { label: 'Crow Pose to Planche', type: 'hold', target: '5 seconds', targetSeconds: 5,
        question: 'Did you achieve a 5-second Full Planche today?',
        unlocksFlow: 'flowB', folderComplete: 'push', video: 'level-6-planche.mp4' },
  7:  { label: 'Dead Hang', type: 'hold', target: '1.5 minutes', targetSeconds: 90,
        question: 'Did you achieve the 1.5-minute continuous Dead Hang today?',
        warmupAdd: { label: 'Dead Hang', target: '1 min' }, video: 'level-7-dead-hang.mp4' },
  8:  { label: 'Strict Chest-to-Bar Pull-ups', type: 'reps', target: '10 reps',
        question: 'Did you achieve 10 clean strict Chest-to-Bar Pull-ups today?',
        warmupAdd: { label: '5 Chest-to-Bar Pull-ups' }, video: 'level-8-chest-to-bar.mp4' },
  9:  { label: 'High Explosive Pull-ups', type: 'reps', target: '3 consecutive belly-button pull-ups',
        question: 'Did you achieve 3 consecutive belly-button explosive pull-ups today?',
        warmupAdd: { label: '3 Explosive Pull-ups' }, video: 'level-9-explosive-pullups.mp4' },
  10: { label: 'Jumping & Negative Muscle-Up', type: 'reps', target: '5 ultra-slow negatives',
        question: 'Did you control 5 ultra-slow muscle-up negatives today?',
        warmupAdd: { label: '3 Controlled Negatives' }, video: 'level-10-muscle-up-negative.mp4' },
  11: { label: 'Strict Bar Muscle-Up', type: 'reps', target: '5 strict, consecutive reps',
        question: 'Did you achieve 5 strict, consecutive Bar Muscle-Ups today?',
        warmupAdd: { label: '2 Strict Muscle-Ups' }, video: 'level-11-bar-muscle-up.mp4' },
  12: { label: 'Tuck Front Lever', type: 'hold', target: '20 seconds', targetSeconds: 20,
        question: 'Did you hold a clean Tuck Front Lever for 20 seconds today?',
        warmupAdd: { label: '10s Tuck Lever Hold' }, video: 'level-12-tuck-front-lever.mp4' },
  13: { label: 'Advanced Tuck Front Lever', type: 'hold', target: '15 seconds', targetSeconds: 15,
        question: 'Did you achieve a flat-back Advanced Tuck hold for 15 seconds today?',
        warmupAdd: { label: '10s Advanced Tuck Hold' }, video: 'level-13-advanced-tuck-lever.mp4' },
  14: { label: 'Single-Leg Front Lever', type: 'hold', target: '10 seconds', targetSeconds: 10,
        question: 'Did you achieve a clean 10-second Single-Leg Front Lever today?',
        warmupAdd: { label: 'Single-Leg Lever Holds' }, video: 'level-14-single-leg-lever.mp4' },
  15: { label: 'Full Front Lever', type: 'hold', target: '5 seconds', targetSeconds: 5,
        question: 'Did you achieve a perfect 5-second Full Front Lever today?',
        unlocksFlow: 'flowC', folderComplete: 'pull', video: 'level-15-full-front-lever.mp4' },
  16: { label: 'GOD-MODE ROUTINE', type: 'flow', isMaintenance: true,
        question: 'Did you complete all 20 Pushing and 20 Pulling loop reps today?', video: 'level-16-god-mode.mp4' },
};

// Flow definitions used as warmups/finishers once unlocked
const FLOWS = {
  flowA: { name: 'Push Flow', reps: 10, sequence: [
    { label: 'L-Sit', seconds: 5 }, { label: 'Handstand', seconds: 5 }, { label: 'L-Sit', seconds: 5 },
  ] },
  flowB: { name: 'Push Flow', reps: 10, sequence: [
    { label: 'L-Sit', seconds: 5 }, { label: 'Handstand', seconds: 5 }, { label: 'Planche', seconds: 5 }, { label: 'L-Sit', seconds: 5 },
  ] },
  flowBFinal: { name: 'Master Pushing Flow', reps: 20, sequence: [
    { label: 'L-Sit', seconds: 5 }, { label: 'Handstand', seconds: 5 }, { label: 'Planche', seconds: 5 }, { label: 'L-Sit', seconds: 5 },
  ] },
  flowC: { name: 'Master Pulling Flow', reps: 20, sequence: [
    { label: 'Muscle-Up Hold', seconds: 5 }, { label: 'Front Lever Hold', seconds: 5 }, { label: 'Muscle-Up Hold', seconds: 5 },
  ] },
};

function getStepData(step) {
  return STEPS[step] || STEPS[16];
}

// Builds the ordered list of warmup blocks for a given current step.
// Each block is either { kind: 'hold', label, targetSeconds } or { kind: 'flow', flowKey }.
function getWarmupBlocks(step) {
  const blocks = [];

  if (step <= 4) {
    if (step > 1) blocks.push({ kind: 'hold', label: 'L-Sit Hold', targetSeconds: 60 });
    return blocks;
  }

  // Level 5+ achieved -> push warmup becomes a flow instead of plain L-Sit
  if (step >= 6) {
    blocks.push({ kind: 'flow', flowKey: 'flowB' });
  } else if (step >= 5) {
    blocks.push({ kind: 'flow', flowKey: 'flowA' });
  }

  // Pull warmups accumulate individually, same as before
  for (let i = 7; i < step; i++) {
    const s = STEPS[i];
    if (s?.warmupAdd) blocks.push({ kind: 'hold', label: s.warmupAdd.label, targetSeconds: null });
  }

  return blocks;
}

function advanceStep(current, passed) {
  const step = getStepData(current);
  if (step.isMaintenance) return current;
  return passed ? current + 1 : current;
}

module.exports = {
  calculateBaselineCalories,
  calculateWaterTarget,
  getStepData,
  getWarmupBlocks,
  advanceStep,
  STEPS,
  FLOWS,
};
