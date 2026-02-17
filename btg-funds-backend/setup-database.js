const { Client } = require('pg');

const client = new Client({
  host: 'database-btgpactual.ckvag28m07ba.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'btgpactual',
  user: 'master',
  password: 'btgpactual',
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Crear tabla users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        balance NUMERIC NOT NULL DEFAULT 500000
      );
    `);
    console.log('✅ Tabla users creada');

    // Crear tabla transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL REFERENCES users(user_id),
        fund_id VARCHAR(10) NOT NULL,
        amount NUMERIC NOT NULL,
        type VARCHAR(20) NOT NULL,
        date TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Tabla transactions creada');

    // Insertar usuario de prueba
    await client.query(`
      INSERT INTO users (user_id, email, balance)
      VALUES ('test-user-123', 'test@example.com', 500000)
      ON CONFLICT (user_id) DO NOTHING;
    `);
    console.log('✅ Usuario de prueba creado');

    // Verificar tablas
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('\n📋 Tablas en la base de datos:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Verificar usuario de prueba
    const userResult = await client.query('SELECT * FROM users;');
    console.log('\n👤 Usuarios en la base de datos:');
    console.log(userResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

setupDatabase();
