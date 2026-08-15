const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is missing.');

  const db = await mongoose.connect(MONGODB_URI);
  isConnected = db.connections[0].readyState === 1;
}

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  country: { type: String, default: '' },
  onboarded: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationTokenExpires: { type: Date, default: null },
  current_weight: { type: Number, default: null },
  height: { type: Number, default: null },
  age: { type: Number, default: null },
  current_skill_step: { type: Number, default: 1 },
  last_weight_check: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const WorkoutLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true }, // 'day1' | 'day2'
  status: { type: String, required: true }, // 'completed' | 'leveled_up' | 'locked_in'
  date: { type: Date, default: Date.now },
});

const NutritionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // 'food' | 'water'
  value: { type: Number, required: true },
  rawText: { type: String, default: '' },
  date: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const WorkoutLog = mongoose.models.WorkoutLog || mongoose.model('WorkoutLog', WorkoutLogSchema);
const NutritionLog = mongoose.models.NutritionLog || mongoose.model('NutritionLog', NutritionLogSchema);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = {
  // ---- Auth ----
  async findUserByEmail(email) {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return null;
    return {
      id: user._id,
      email: user.email,
      password: user.password,
      onboarded: user.onboarded,
      verified: user.verified,
    };
  },

  async createUser(email, password, country, verificationToken, verificationTokenExpires) {
    await connectDB();
    const newUser = new User({
      email: email.toLowerCase().trim(),
      password,
      country,
      verificationToken,
      verificationTokenExpires,
    });
    await newUser.save();
    return { id: newUser._id, email: newUser.email, onboarded: newUser.onboarded };
  },

  async verifyUserByToken(token) {
    await connectDB();
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });
    if (!user) return null;

    user.verified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    return { id: user._id, email: user.email, onboarded: user.onboarded };
  },

  // ---- User ----
  async findUserById(userId) {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return null;
    return {
      id: user._id,
      email: user.email,
      country: user.country,
      onboarded: user.onboarded,
      verified: user.verified,
      current_weight: user.current_weight,
      height: user.height,
      age: user.age,
      current_skill_step: user.current_skill_step,
      last_weight_check: user.last_weight_check,
      password: user.password,
    };
  },

  async completeOnboarding(userId, current_weight, height, age) {
    await connectDB();
    await User.findByIdAndUpdate(userId, {
      current_weight,
      height,
      age,
      onboarded: true,
      last_weight_check: new Date(),
    });
  },

  async updateWeightCheck(userId, weight, height) {
    await connectDB();
    const update = { current_weight: weight, last_weight_check: new Date() };
    if (height) update.height = height;
    await User.findByIdAndUpdate(userId, update);
  },

  async updateSkillStep(userId, newStep) {
    await connectDB();
    await User.findByIdAndUpdate(userId, { current_skill_step: newStep });
  },

  // ---- Workouts ----
  async logWorkoutSession(userId, day, status) {
    await connectDB();
    await WorkoutLog.create({ userId, day, status });
  },

  async isWorkoutCompletedToday(userId, day) {
    await connectDB();
    const log = await WorkoutLog.findOne({ userId, day, date: { $gte: startOfToday() } });
    return !!log;
  },

  // ---- Nutrition ----
  async addNutritionLog(userId, type, value, rawText) {
    await connectDB();
    await NutritionLog.create({ userId, type, value, rawText });
  },

  async getTodayTotals(userId) {
    await connectDB();
    const logs = await NutritionLog.find({ userId, date: { $gte: startOfToday() } });
    const totals = { food: 0, water: 0 };
    for (const log of logs) {
      if (log.type === 'food') totals.food += log.value;
      else if (log.type === 'water') totals.water += log.value;
    }
    return totals;
  },
};
