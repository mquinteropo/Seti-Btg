const authController = require('./authController');
const pool = require('../models/pgClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../models/pgClient');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      req.body = {
        userId: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // Check if user exists
        .mockResolvedValueOnce({}); // Insert user

      bcrypt.hash.mockResolvedValue('hashedPassword');

      await authController.register(req, res);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuario registrado' });
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = {
        userId: 'testuser'
        // Missing email and password
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Datos requeridos' });
    });

    it('should return 409 if user already exists', async () => {
      req.body = {
        userId: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      pool.query.mockResolvedValueOnce({ rows: [{ user_id: 'testuser' }] });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'El userId ya existe.' });
    });

    it('should handle database errors', async () => {
      req.body = {
        userId: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      pool.query.mockRejectedValueOnce(new Error('Database error'));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error en el registro',
        details: 'Database error'
      });
    });
  });

  describe('login', () => {
    it('should login user successfully and return token', async () => {
      req.body = {
        userId: 'testuser',
        password: 'password123'
      };

      const mockUser = {
        user_id: 'testuser',
        password: 'hashedPassword',
        role: 'user'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-jwt-token');

      await authController.login(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE user_id = $1',
        ['testuser']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'testuser', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      expect(res.json).toHaveBeenCalledWith({ token: 'fake-jwt-token' });
    });

    it('should return 400 if user not found', async () => {
      req.body = {
        userId: 'nonexistent',
        password: 'password123'
      };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });

    it('should return 400 if password is invalid', async () => {
      req.body = {
        userId: 'testuser',
        password: 'wrongpassword'
      };

      const mockUser = {
        user_id: 'testuser',
        password: 'hashedPassword',
        role: 'user'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciales inválidas' });
    });

    it('should handle login errors', async () => {
      req.body = {
        userId: 'testuser',
        password: 'password123'
      };

      pool.query.mockRejectedValueOnce(new Error('Database error'));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error en el login',
        details: 'Database error'
      });
    });
  });
});
