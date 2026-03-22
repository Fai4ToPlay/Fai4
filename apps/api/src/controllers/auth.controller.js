import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

export async function login(req, res) {
  const { email, password } = req.body;
  const result = await query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ message: 'Неверный логин или пароль' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Неверный логин или пароль' });

  const token = jwt.sign({ id: user.id, role: user.role, fullName: user.full_name }, env.jwtSecret, {
    expiresIn: '10h'
  });
  return res.json({ token });
}
