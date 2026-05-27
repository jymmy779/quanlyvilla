/**
 * Test script to verify Knex query generation for all 3 dialects.
 * Runs WITHOUT a live database — just validates SQL generation.
 */
const knex = require('knex');

function testDialect(dialect) {
  console.log(`\n=== Testing ${dialect} ===`);
  
  const db = knex({
    client: dialect,
    useNullAsDefault: true,
  });

  // Test SELECT
  let sql = db('users').where({ email: 'test@test.com' }).first().toSQL();
  console.log('SELECT with where:', sql.sql);
  console.log('Bindings:', sql.bindings);
  console.assert(sql.sql.includes('select') || sql.sql.includes('SELECT'), 'SELECT failed');

  // Test INSERT
  sql = db('users').insert({ id: 'abc-123', email: 'a@b.com', password_hash: 'hash' }).toSQL();
  console.log('INSERT:', sql.sql);

  // Test UPDATE
  sql = db('profiles').where({ id: 'abc-123' }).update({ full_name: 'Test' }).toSQL();
  console.log('UPDATE:', sql.sql);

  // Test DELETE
  sql = db('bookings').where({ id: 'xyz' }).del().toSQL();
  console.log('DELETE:', sql.sql);

  // Test JOIN
  sql = db('bookings')
    .join('villas', 'bookings.villa_id', 'villas.id')
    .select('bookings.*', 'villas.name as villa_name')
    .where('bookings.tenant_id', 't1')
    .toSQL();
  console.log('JOIN:', sql.sql);

  db.destroy();
  console.log(`✓ ${dialect} OK`);
}

try {
  testDialect('pg');
  testDialect('mysql2');
  testDialect('mssql');
  console.log('\n✓ All dialects passed!');
} catch (err) {
  console.error('✗ Test failed:', err.message);
  process.exit(1);
}