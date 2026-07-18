require('dotenv').config();
const mongoose = require('mongoose');

const UserAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'manager' },
  createdAt: { type: String },
}, { strict: true });

const UserAccount = mongoose.model('UserAccount', UserAccountSchema, 'users');

async function removeManager() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const result = await UserAccount.deleteOne({ username: 'manager' });
  console.log('Delete result:', result);
  
  const allUsers = await UserAccount.find();
  console.log('All remaining users:', allUsers);
  
  process.exit(0);
}

removeManager();
