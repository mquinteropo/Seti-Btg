const pool = require('../models/pgClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { userId, email, password, phone, role } = req.body;
    if (!userId || !email || !password) return res.status(400).json({ error: 'Datos requeridos' });

    const exists = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'El userId ya existe.' });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (user_id, email, password, phone, role, balance) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, email, hash, phone || null, role || 'user', 500000]
    );
    res.status(201).json({ message: 'Usuario registrado' });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error en el registro', details: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { userId, password } = req.body;
    const userRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el login', details: error.message });
  }
};
