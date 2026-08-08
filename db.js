const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Run this once in Supabase's SQL editor to create tables:
/*
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  country TEXT,
  current_weight INTEGER,
  height INTEGER,
  onboarded BOOLEAN DEFAULT false,
  current_skill_step INTEGER DEFAULT 1,
  last_weight_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE nutrition_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  raw_text TEXT,
  logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  day TEXT NOT NULL,
  status TEXT,
  logged_at TIMESTAMPTZ DEFAULT now()
);
*/

const db = {
  findUserByUsername: async (username) => {
    const { data } = await supabase.from('users').select('*').eq('username', username).single();
    return data;
  },
  findUserById: async (id) => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data;
  },
  createUser: async (username, hashedPassword, country) => {
    const { data, error } = await supabase.from('users').insert({ username, password: hashedPassword, country }).select().single();
    if (error) throw error;
    return data;
  },
  completeOnboarding: async (id, weight, height) => {
    await supabase.from('users').update({ current_weight: weight, height, onboarded: true, last_weight_check: new Date().toISOString() }).eq('id', id);
  },
  updateWeightCheck: async (id, weight, height) => {
    const update = { current_weight: weight, last_weight_check: new Date().toISOString() };
    if (height) update.height = height;
    await supabase.from('users').update(update).eq('id', id);
  },
  updateSkillStep: async (id, step) => {
    await supabase.from('users').update({ current_skill_step: step }).eq('id', id);
  },
  addNutritionLog: async (userId, type, value, rawText) => {
    await supabase.from('nutrition_logs').insert({ user_id: userId, type, value, raw_text: rawText });
  },
  getTodayTotals: async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('nutrition_logs').select('type, value').eq('user_id', userId).gte('logged_at', today);
    const totals = { food: 0, water: 0 };
    (data || []).forEach((r) => { totals[r.type] += r.value; });
    return totals;
  },
  logWorkoutSession: async (userId, day, status) => {
    await supabase.from('workout_progress').insert({ user_id: userId, day, status });
  },
  isWorkoutCompletedToday: async (userId, day) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('workout_progress').select('id').eq('user_id', userId).eq('day', day).gte('logged_at', today).limit(1);
    return data && data.length > 0;
  },
};

module.exports = db;
