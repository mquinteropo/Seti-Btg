const AWS = require('aws-sdk');
const NotificationStrategy = require('./NotificationStrategy');

/**
 * Estrategia concreta para notificaciones por SMS usando AWS SNS
 */
class SMSNotificationStrategy extends NotificationStrategy {
  constructor() {
    super();
    this.sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  /**
   * Enviar SMS usando AWS SNS
   */
  async send(recipient, message, metadata = {}) {
    this.validate(recipient);

    // Formatear número a formato internacional si no lo está
    const phoneNumber = this.formatPhoneNumber(recipient);

    const params = {
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional' // Transactional para alta prioridad
        }
      }
    };

    try {
      const result = await this.sns.publish(params).promise();
      console.log(`[SMS STRATEGY] ✅ SMS enviado a ${phoneNumber}`, result.MessageId);
      return {
        success: true,
        messageId: result.MessageId,
        channel: 'sms'
      };
    } catch (error) {
      console.error(`[SMS STRATEGY] ❌ Error enviando SMS a ${phoneNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Validar y formatear número de teléfono
   */
  validate(recipient) {
    // Eliminar espacios, guiones, paréntesis
    const cleaned = recipient.replace(/[\s\-()]/g, '');

    // Verificar que solo tenga números y opcionalmente +
    if (!/^\+?[0-9]{10,15}$/.test(cleaned)) {
      throw new Error(`Número de teléfono inválido: ${recipient}`);
    }
    return true;
  }

  /**
   * Formatear número a formato internacional (+57...)
   */
  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/[\s\-()]/g, '');

    // Si no tiene +, agregar +57 (Colombia) por defecto
    // Puedes cambiar esto según tu país
    if (!cleaned.startsWith('+')) {
      // Si empieza con 57, solo agregar +
      if (cleaned.startsWith('57')) {
        cleaned = '+' + cleaned;
      } else {
        // Agregar +57 (cambia según necesites)
        cleaned = '+57' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Nombre del canal
   */
  getChannelName() {
    return 'sms';
  }
}

module.exports = SMSNotificationStrategy;
