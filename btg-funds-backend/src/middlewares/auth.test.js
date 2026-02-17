const { authenticate, authorize } = require('./auth');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and call next()', () => {
      req.headers.authorization = 'Bearer valid-token';
      const decodedToken = { userId: 'testuser', role: 'user' };

      jwt.verify.mockReturnValue(decodedToken);

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(req.user).toEqual(decodedToken);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no token provided', () => {
      req.headers.authorization = undefined;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing Bearer prefix', () => {
      req.headers.authorization = 'invalid-format';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
    });
  });

  describe('authorize', () => {
    it('should authorize user with correct role', () => {
      req.user = { userId: 'testuser', role: 'admin' };

      const middleware = authorize('admin', 'superadmin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not authorized', () => {
      req.user = { userId: 'testuser', role: 'user' };

      const middleware = authorize('admin', 'superadmin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with single role', () => {
      req.user = { userId: 'testuser', role: 'user' };

      const middleware = authorize('user');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
