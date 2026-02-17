/**
 * Interface/Base class para Strategy Pattern
 * Open/Closed Principle: Abierto para extensión, cerrado para modificación
 */
class NotificationStrategy {
  /**
   * Método abstracto que debe implementar cada estrategia
   * @param {string} recipient - Email, phone, etc.
   * @param {string} message - Mensaje a enviar
   * @param {Object} metadata - Datos adicionales
   */
  async send(recipient, message, metadata = {}) {
    throw new Error('El método send() debe ser implementado por la estrategia concreta');
  }

  /**
   * Validar que el destinatario sea válido para esta estrategia
   */
  validate(recipient) {
    throw new Error('El método validate() debe ser implementado por la estrategia concreta');
  }

  /**
   * Obtener el nombre del canal
   */
  getChannelName() {
    throw new Error('El método getChannelName() debe ser implementado por la estrategia concreta');
  }
}

module.exports = NotificationStrategy;
