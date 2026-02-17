const fundService = require('./fundService');
const fundModel = require('../models/fundModel');
const pool = require('../models/pgClient');
const notificationContext = require('./NotificationContext');

jest.mock('../models/fundModel');
jest.mock('../models/pgClient');
jest.mock('./NotificationContext', () => ({
  send: jest.fn(),
  isChannelAvailable: jest.fn().mockReturnValue(true)
}));
jest.mock('uuid', () => ({ v4: () => 'test-uuid-123' }));

describe('Fund Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeFund', () => {
    it('should successfully subscribe to a fund', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada',
        minAmount: 50000
      };

      const mockUser = {
        user_id: 'testuser',
        email: 'test@example.com',
        balance: 500000
      };

      fundModel.getFundById.mockResolvedValue(mockFund);
      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [] }) // Check active subscription
        .mockResolvedValueOnce({}) // Update balance
        .mockResolvedValueOnce({}); // Insert transaction

      notificationContext.send.mockResolvedValue({ success: true, channel: 'email' });

      const result = await fundService.subscribeFund({
        userId: 'testuser',
        fundId: 'DEUDAPRIVADA',
        amount: 100000
      });

      expect(fundModel.getFundById).toHaveBeenCalledWith('DEUDAPRIVADA');
      expect(pool.query).toHaveBeenCalledTimes(4);
      expect(result.message).toBe('Suscripción exitosa');
      expect(result.balance).toBe(400000);
    });

    it('should send subscription notification by sms when requested', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada',
        minAmount: 50000
      };

      const mockUser = {
        user_id: 'testuser',
        email: 'test@example.com',
        phone: '+573001234567',
        balance: 500000
      };

      fundModel.getFundById.mockResolvedValue(mockFund);
      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      notificationContext.send.mockResolvedValue({ success: true, channel: 'sms' });

      await fundService.subscribeFund({
        userId: 'testuser',
        fundId: 'DEUDAPRIVADA',
        amount: 100000,
        notifyBy: 'sms'
      });

      expect(notificationContext.send).toHaveBeenCalledWith(
        'sms',
        '+573001234567',
        expect.stringContaining('Suscrip'),
        expect.any(Object)
      );
    });

    it('should throw error if fund not found', async () => {
      fundModel.getFundById.mockResolvedValue(null);

      await expect(
        fundService.subscribeFund({
          userId: 'testuser',
          fundId: 'INVALID',
          amount: 100000
        })
      ).rejects.toThrow('Fondo no encontrado');
    });

    it('should throw error if amount is below minimum', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada',
        minAmount: 50000
      };

      fundModel.getFundById.mockResolvedValue(mockFund);

      await expect(
        fundService.subscribeFund({
          userId: 'testuser',
          fundId: 'DEUDAPRIVADA',
          amount: 30000 // Below minimum
        })
      ).rejects.toThrow('El monto mínimo para este fondo es 50000');
    });

    it('should throw error if user not found', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada',
        minAmount: 50000
      };

      fundModel.getFundById.mockResolvedValue(mockFund);
      pool.query.mockResolvedValueOnce({ rows: [] }); // User not found

      await expect(
        fundService.subscribeFund({
          userId: 'nonexistent',
          fundId: 'DEUDAPRIVADA',
          amount: 100000
        })
      ).rejects.toThrow('Usuario no encontrado');
    });

    it('should throw error if insufficient balance', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada',
        minAmount: 50000
      };

      const mockUser = {
        user_id: 'testuser',
        email: 'test@example.com',
        balance: 30000 // Insufficient
      };

      fundModel.getFundById.mockResolvedValue(mockFund);
      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] }); // No active subscription

      await expect(
        fundService.subscribeFund({
          userId: 'testuser',
          fundId: 'DEUDAPRIVADA',
          amount: 100000
        })
      ).rejects.toThrow('No tiene saldo disponible para vincularse al fondo Deuda Privada');
    });

    it('should throw error if active subscription exists', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada',
        minAmount: 50000
      };

      const mockUser = {
        user_id: 'testuser',
        email: 'test@example.com',
        balance: 500000
      };

      fundModel.getFundById.mockResolvedValue(mockFund);
      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Active subscription exists

      await expect(
        fundService.subscribeFund({
          userId: 'testuser',
          fundId: 'DEUDAPRIVADA',
          amount: 100000
        })
      ).rejects.toThrow('Ya existe una suscripción activa al fondo Deuda Privada');
    });
  });

  describe('cancelSubscription', () => {
    it('should successfully cancel subscription', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada'
      };

      const mockUser = {
        user_id: 'testuser',
        email: 'test@example.com',
        balance: 400000
      };

      const mockLastTx = {
        amount: 100000
      };

      fundModel.getFundById.mockResolvedValue(mockFund);
      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [mockLastTx] }) // Get last transaction
        .mockResolvedValueOnce({}) // Update balance
        .mockResolvedValueOnce({}); // Insert cancellation transaction

      notificationContext.send.mockResolvedValue({ success: true, channel: 'email' });

      const result = await fundService.cancelSubscription({
        userId: 'testuser',
        fundId: 'DEUDAPRIVADA'
      });

      expect(result.message).toBe('Cancelación exitosa');
      expect(result.balance).toBe(500000);
    });

    it('should throw error if fund not found', async () => {
      fundModel.getFundById.mockResolvedValue(null);

      await expect(
        fundService.cancelSubscription({
          userId: 'testuser',
          fundId: 'INVALID'
        })
      ).rejects.toThrow('Fondo no encontrado');
    });

    it('should throw error if no active subscription', async () => {
      const mockFund = {
        id: 'DEUDAPRIVADA',
        name: 'Deuda Privada'
      };

      const mockUser = {
        user_id: 'testuser',
        email: 'test@example.com',
        balance: 500000
      };

      fundModel.getFundById.mockResolvedValue(mockFund);
      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] }); // No active subscription

      await expect(
        fundService.cancelSubscription({
          userId: 'testuser',
          fundId: 'DEUDAPRIVADA'
        })
      ).rejects.toThrow('No hay suscripción activa a este fondo');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history for user', async () => {
      const mockUser = {
        user_id: 'testuser'
      };

      const mockTransactions = [
        {
          id: '1',
          user_id: 'testuser',
          fund_id: 'DEUDAPRIVADA',
          amount: 100000,
          type: 'SUBSCRIPTION',
          date: new Date()
        }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: mockTransactions });

      const result = await fundService.getTransactionHistory('testuser');

      expect(result).toEqual(mockTransactions);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error if user not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        fundService.getTransactionHistory('nonexistent')
      ).rejects.toThrow('Usuario no encontrado');
    });
  });
});
