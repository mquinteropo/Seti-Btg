require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📧 Email SES: ${process.env.SES_FROM_EMAIL}`);
  console.log(`🌎 AWS Region: ${process.env.AWS_REGION}`);
  console.log(`💾 PostgreSQL: ${process.env.PG_HOST}`);
  console.log(`📊 DynamoDB Table: ${process.env.FUNDS_TABLE}`);
});
