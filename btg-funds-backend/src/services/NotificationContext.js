const EmailNotificationStrategy = require('../strategies/EmailNotificationStrategy');
const SMSNotificationStrategy = require('../strategies/SMSNotificationStrategy');

/**
 * Context del patrón Strategy
 * Selecciona y ejecuta la estrategia de notificación apropiada
 *
 * SOLID Principles demostrados:
 * - Open/Closed: Abierto para extensión (nuevas estrategias), cerrado para modificación
 * - Single Responsibility: Solo se encarga de delegar a la estrategia correcta
 * - Dependency Inversion: Depende de abstracciones (NotificationStrategy), no de implementaciones concretas
 */
class NotificationContext {
  constructor() {
    // Registry de estrategias disponibles
    this.strategies = new Map();
    this.registerDefaultStrategies();
  }

  /**
   * Registrar estrategias por defecto
   */
  registerDefaultStrategies() {
    this.registerStrategy('email', new EmailNotificationStrategy());
    this.registerStrategy('sms', new SMSNotificationStrategy());
  }

  /**
   * Registrar una nueva estrategia (extensibilidad)
   * Esto permite agregar nuevos canales sin modificar este código
   *
   * Ejemplo: notificationContext.registerStrategy('whatsapp', new WhatsAppStrategy());
   */
  registerStrategy(channelName, strategy) {
    this.strategies.set(channelName.toLowerCase(), strategy);
    console.log(`[NOTIFICATION CONTEXT] Estrategia registrada: ${channelName}`);
  }

  /**
   * Enviar notificación usando la estrategia apropiada
   *
   * @param {string} channel - Canal de notificación ('email', 'sms', etc.)
   * @param {string} recipient - Destinatario (email, teléfono, etc.)
   * @param {string} message - Mensaje a enviar
   * @param {Object} metadata - Datos adicionales (subject, html, etc.)
   */
  async send(channel, recipient, message, metadata = {}) {
    const channelKey = channel.toLowerCase();

    // Obtener la estrategia apropiada
    const strategy = this.strategies.get(channelKey);

    if (!strategy) {
      const availableChannels = Array.from(this.strategies.keys()).join(', ');
      throw new Error(
        `Canal de notificación no soportado: ${channel}. Canales disponibles: ${availableChannels}`
      );
    }

    try {
      console.log(`[NOTIFICATION CONTEXT] Usando estrategia: ${strategy.getChannelName()}`);
      console.log(`[NOTIFICATION CONTEXT] Destinatario: ${recipient}`);

      const result = await strategy.send(recipient, message, metadata);

      return {
        ...result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[NOTIFICATION CONTEXT] Error en canal ${channel}:`, error.message);

      // No lanzar el error - permitir que la operación principal continúe
      return {
        success: false,
        error: error.message,
        channel: channelKey,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verificar si un canal está disponible
   */
  isChannelAvailable(channel) {
    return this.strategies.has(channel.toLowerCase());
  }

  /**
   * Obtener lista de canales disponibles
   */
  getAvailableChannels() {
    return Array.from(this.strategies.keys());
  }
}

// Singleton pattern - una sola instancia compartida
const notificationContext = new NotificationContext();

module.exports = notificationContext;
