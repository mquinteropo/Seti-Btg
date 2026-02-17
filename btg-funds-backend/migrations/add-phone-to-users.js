require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Agregando columna phone a tabla users...');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
