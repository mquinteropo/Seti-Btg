const request = require('supertest');
const app = require('./app');
const pool = require('./models/pgClient');
const fundModel = require('./models/fundModel');

jest.mock('./models/pgClient');
jest.mock('./models/fundModel');
jest.mock('./utils/notification');

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
        .mockResolvedValueOnce({}); // Insert successful

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'newuser',
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Usuario registrado');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'newuser'
          // Missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos requeridos');
    });

    it('should return 409 for duplicate user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ user_id: 'existing' }] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'existing',
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'El userId ya existe.');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        user_id: 'testuser',
        password: '$2a$10$fakeHashedPassword', // Mock bcrypt hash
        role: 'user'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Mock bcrypt.compare to return true
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should return 400 for non-existent user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Usuario no encontrado');
    });
  });

  describe('POST /api/funds/subscribe', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/funds/subscribe')
        .send({
          fundId: 'DEUDAPRIVADA',
          amount: 100000
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token requerido');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/funds/subscribe')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          fundId: 'DEUDAPRIVADA',
          amount: 100000
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });
  });

  describe('POST /api/funds/cancel', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/funds/cancel')
        .send({
          fundId: 'DEUDAPRIVADA'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/funds/history/:userId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/funds/history/testuser');

      expect(response.status).toBe(401);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/auth/login');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include CORS headers in responses', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'test',
          email: 'test@test.com',
          password: 'pass'
        });

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});
