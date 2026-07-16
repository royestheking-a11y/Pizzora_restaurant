import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign({ username: 'pizzora', role: 'admin' }, process.env.JWT_SECRET || 'secret');
console.log("Token:", token);

fetch('http://localhost:3001/api/state/admin', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.text()).then(text => console.log("Response:", text.substring(0, 200)));
