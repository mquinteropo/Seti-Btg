const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: process.env.AWS_REGION });

const FROM_EMAIL = process.env.SES_FROM_EMAIL;

exports.send = async (userId, method, message, toEmail) => {
  if (method === 'email') {
    if (!toEmail) throw new Error('Se requiere el email de destino');
    const params = {
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: 'Notificación de suscripción a fondo' },
        Body: { Text: { Data: message } }
      }
    };
    await ses.sendEmail(params).promise();
    console.log(`[SES][email] Email enviado a ${toEmail}`);
    return true;
  }
  console.log(`[NOTIFICACIÓN][${method}] Usuario: ${userId} - ${message}`);
  return true;
};
