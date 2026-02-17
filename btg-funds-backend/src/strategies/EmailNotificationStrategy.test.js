const EmailNotificationStrategy = require('./EmailNotificationStrategy');

const mockSendEmail = jest.fn();

jest.mock('aws-sdk', () => ({
  SES: jest.fn(() => ({
    sendEmail: mockSendEmail
  }))
}));

describe('EmailNotificationStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SES_FROM_EMAIL = 'sender@example.com';
  });

  it('sends email without Html body when metadata.html is not provided', async () => {
    const promiseMock = jest.fn().mockResolvedValue({ MessageId: 'msg-1' });
    mockSendEmail.mockReturnValue({ promise: promiseMock });

    const strategy = new EmailNotificationStrategy();
    await strategy.send('user@example.com', 'Hola', { subject: 'Prueba' });

    expect(mockSendEmail).toHaveBeenCalledWith({
      Source: 'sender@example.com',
      Destination: { ToAddresses: ['user@example.com'] },
      Message: {
        Subject: { Data: 'Prueba' },
        Body: {
          Text: { Data: 'Hola' }
        }
      }
    });
  });

  it('includes Html body when metadata.html is provided', async () => {
    const promiseMock = jest.fn().mockResolvedValue({ MessageId: 'msg-2' });
    mockSendEmail.mockReturnValue({ promise: promiseMock });

    const strategy = new EmailNotificationStrategy();
    await strategy.send('user@example.com', 'Hola', {
      subject: 'Prueba HTML',
      html: '<p>Hola</p>'
    });

    expect(mockSendEmail).toHaveBeenCalledWith({
      Source: 'sender@example.com',
      Destination: { ToAddresses: ['user@example.com'] },
      Message: {
        Subject: { Data: 'Prueba HTML' },
        Body: {
          Text: { Data: 'Hola' },
          Html: { Data: '<p>Hola</p>' }
        }
      }
    });
  });

  it('throws error for invalid email recipient', async () => {
    const strategy = new EmailNotificationStrategy();

    await expect(strategy.send('correo-invalido', 'Hola')).rejects.toThrow('Email invalido: correo-invalido');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
