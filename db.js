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
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  country: { type: String, default: '' },
  onboarded: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = {
  async findUserByUsername(username) {
    await connectDB();
    const user = await User.findOne({ username });
    if (!user) return null;
    return { id: user._id, username: user.username, password: user.password, onboarded: user.onboarded };
  },

  async createUser(username, password, country) {
    await connectDB();
    const newUser = new User({ username, password, country });
    await newUser.save();
    return { id: newUser._id, username: newUser.username, onboarded: newUser.onboarded };
  }
};
