const AWS = require('aws-sdk');
const NotificationStrategy = require('./NotificationStrategy');

/**
 * Estrategia concreta para notificaciones por Email usando AWS SES
 */
class EmailNotificationStrategy extends NotificationStrategy {
  constructor() {
    super();
    this.ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });
    this.fromEmail = process.env.SES_FROM_EMAIL;
  }

  /**
   * Enviar email usando AWS SES
   */
  async send(recipient, message, metadata = {}) {
    this.validate(recipient);

    const body = {
      Text: {
        Data: message
      }
    };

    if (metadata.html) {
      body.Html = {
        Data: metadata.html
      };
    }

    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [recipient]
      },
      Message: {
        Subject: {
          Data: metadata.subject || 'Notificacion BTG Pactual'
        },
        Body: body
      }
    };

    try {
      const result = await this.ses.sendEmail(params).promise();
      console.log(`[EMAIL STRATEGY] Email enviado a ${recipient}`, result.MessageId);
      return {
        success: true,
        messageId: result.MessageId,
        channel: 'email'
      };
    } catch (error) {
      console.error(`[EMAIL STRATEGY] Error enviando email a ${recipient}:`, error.message);
      throw error;
    }
  }

  /**
   * Validar formato de email
   */
  validate(recipient) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      throw new Error(`Email invalido: ${recipient}`);
    }
    return true;
  }

  /**
   * Nombre del canal
   */
  getChannelName() {
    return 'email';
  }
}

module.exports = EmailNotificationStrategy;
