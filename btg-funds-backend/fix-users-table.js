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

async function fixUsersTable() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Agregar columna password
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    `);
    console.log('✅ Columna password agregada');

    // Agregar columna role
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    `);
    console.log('✅ Columna role agregada');

    // Verificar estructura de la tabla
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Estructura de la tabla users:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

fixUsersTable();
