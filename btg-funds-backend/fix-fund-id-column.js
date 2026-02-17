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

async function fixFundIdColumn() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Aumentar tamaño de columna fund_id
    await client.query(`
      ALTER TABLE transactions
      ALTER COLUMN fund_id TYPE VARCHAR(50);
    `);
    console.log('✅ Columna fund_id actualizada a VARCHAR(50)');

    // Verificar estructura
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Estructura de la tabla transactions:');
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

fixFundIdColumn();
