const { v4: uuidv4 } = require('uuid');
const fundModel = require('../models/fundModel');
const notificationContext = require('./NotificationContext');
const pool = require('../models/pgClient');

const resolveNotificationTarget = (user, notifyBy) => {
  const requestedChannel = (notifyBy || 'email').toLowerCase();
  const channel = notificationContext.isChannelAvailable(requestedChannel) ? requestedChannel : 'email';
  const recipient = channel === 'sms' ? user.phone : user.email;

  return { channel, recipient };
};

exports.subscribeFund = async ({ userId, fundId, amount, notifyBy }) => {
  const fund = await fundModel.getFundById(fundId);
  if (!fund) throw new Error('Fondo no encontrado');
  if (amount < fund.minAmount) throw new Error(`El monto mínimo para este fondo es ${fund.minAmount}`);

  const userRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const activeTx = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 AND fund_id = $2 AND type = 'SUBSCRIPTION' AND NOT EXISTS (
      SELECT 1 FROM transactions c WHERE c.user_id = $1 AND c.fund_id = $2 AND c.type = 'CANCELLATION' AND c.date > transactions.date
    )`,
    [userId, fundId]
  );
  if (activeTx.rows.length > 0) {
    throw new Error(`Ya existe una suscripción activa al fondo ${fund.name}`);
  }

  if (user.balance < amount) {
    throw new Error(`No tiene saldo disponible para vincularse al fondo ${fund.name}`);
  }

  const newBalance = Number(user.balance) - Number(amount);
  await pool.query('UPDATE users SET balance = $1 WHERE user_id = $2', [newBalance, userId]);
  const txId = uuidv4();
  const now = new Date();
  await pool.query(
    'INSERT INTO transactions (id, user_id, fund_id, amount, type, date) VALUES ($1, $2, $3, $4, $5, $6)',
    [txId, userId, fundId, amount, 'SUBSCRIPTION', now]
  );

  // Enviar notificación usando Strategy Pattern (no bloquear si falla)
  try {
    const { channel, recipient } = resolveNotificationTarget(user, notifyBy);

    if (!recipient) {
      console.warn(`[NOTIFICATION] Usuario no tiene ${channel === 'sms' ? 'teléfono' : 'email'} configurado`);
    } else {
      const message = `Suscripción exitosa al fondo ${fund.name}. Monto: $${amount.toLocaleString()}`;
      const result = await notificationContext.send(channel, recipient, message, {
        subject: 'Suscripción Exitosa - BTG Pactual'
      });

      if (result.success) {
        console.log(`[NOTIFICATION] âœ… Notificación enviada por ${channel} a ${recipient}`);
      } else {
        console.error(`[NOTIFICATION] âŒ Falló envío por ${channel}:`, result.error);
      }
    }
  } catch (notifError) {
    console.error('[NOTIFICATION ERROR]', notifError.message);
    // No lanzar el error - la transacciÃ³n ya se completÃ³
  }

  return { message: 'Suscripción exitosa', transaction: { id: txId, type: 'SUBSCRIPTION', fundId, amount, date: now }, balance: newBalance };
};

exports.cancelSubscription = async ({ userId, fundId, notifyBy }) => {
  const fund = await fundModel.getFundById(fundId);
  if (!fund) throw new Error('Fondo no encontrado');

  const userRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) throw new Error('Usuario no encontrado');

  const lastTxRes = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 AND fund_id = $2 AND type = 'SUBSCRIPTION' AND NOT EXISTS (
      SELECT 1 FROM transactions c WHERE c.user_id = $1 AND c.fund_id = $2 AND c.type = 'CANCELLATION' AND c.date > transactions.date
    ) ORDER BY date DESC LIMIT 1`,
    [userId, fundId]
  );
  const lastTx = lastTxRes.rows[0];
  if (!lastTx) throw new Error('No hay suscripción activa a este fondo');

  const newBalance = Number(user.balance) + Number(lastTx.amount);
  await pool.query('UPDATE users SET balance = $1 WHERE user_id = $2', [newBalance, userId]);
  const txId = uuidv4();
  const now = new Date();
  await pool.query(
    'INSERT INTO transactions (id, user_id, fund_id, amount, type, date) VALUES ($1, $2, $3, $4, $5, $6)',
    [txId, userId, fundId, lastTx.amount, 'CANCELLATION', now]
  );

  // Enviar notificación usando Strategy Pattern (no bloquear si falla)
  try {
    const { channel, recipient } = resolveNotificationTarget(user, notifyBy);

    if (!recipient) {
      console.warn(`[NOTIFICATION] Usuario no tiene ${channel === 'sms' ? 'teléfono' : 'email'} configurado`);
    } else {
      const message = `Cancelación exitosa del fondo ${fund.name}. Monto devuelto: $${Number(lastTx.amount).toLocaleString()}`;
      const result = await notificationContext.send(channel, recipient, message, {
        subject: 'Cancelación de suscripción - BTG Pactual'
      });

      if (result.success) {
        console.log(`[NOTIFICATION] âœ… Notificación enviada por ${channel} a ${recipient}`);
      } else {
        console.error(`[NOTIFICATION] âŒ Falló envío por ${channel}:`, result.error);
      }
    }
  } catch (notifError) {
    console.error('[NOTIFICATION ERROR]', notifError.message);
    // No lanzar el error - la transacciÃ³n ya se completÃ³
  }

  return { message: 'Cancelación exitosa', transaction: { id: txId, type: 'CANCELLATION', fundId, amount: lastTx.amount, date: now }, balance: newBalance };
};

exports.getTransactionHistory = async (userId) => {
  const userRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) throw new Error('Usuario no encontrado');
  const txRes = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', [userId]);
  return txRes.rows;
};


