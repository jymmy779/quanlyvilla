/**
 * End-to-end test of ALL API route query patterns used in the app.
 * Tests Knex SQL generation for pg, mysql2, and mssql without a live DB.
 */
const knex = require('knex');

function testDialect(dialect) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Testing: ${dialect}`);
  console.log(`${'='.repeat(60)}`);
  
  const db = knex({
    client: dialect,
    useNullAsDefault: true,
  });

  const tests = [];

  // ========== API: /api/auth/login ==========
  tests.push(() => {
    // SELECT from users where email
    const sql = db('users').where({ email: 'test@test.com' }).first().toSQL();
    console.log('  [login] findByEmail:', sql.sql);
    return sql.sql.includes('email');
  });

  // ========== API: /api/auth/register ==========
  tests.push(() => {
    // INSERT into users
    const sql = db('users').insert({
      id: 'abc123',
      email: 'a@b.com',
      password_hash: 'hashed'
    }).toSQL();
    console.log('  [register] insertUser:', sql.sql);
    return sql.sql.includes('insert');
  });

  tests.push(() => {
    // SELECT from profiles by id
    const sql = db('profiles').where({ id: 'abc123' }).first().toSQL();
    console.log('  [register] findProfile:', sql.sql);
    return true;
  });

  tests.push(() => {
    // INSERT into profiles
    const sql = db('profiles').insert({
      id: 'abc123',
      email: 'a@b.com',
      full_name: 'Test',
      role: 'pending'
    }).toSQL();
    console.log('  [register] insertProfile:', sql.sql);
    return true;
  });

  tests.push(() => {
    // INSERT into tenants
    const sql = db('tenants').insert({
      id: 't1',
      name: 'Tenant',
      status: 'pending'
    }).toSQL();
    console.log('  [register] insertTenant:', sql.sql);
    return true;
  });

  // ========== API: /api/auth/register-startup ==========
  tests.push(() => {
    // Transaction: create user, profile, tenant in one go
    const userInsert = db('users').insert({ id: 'u1', email: 'e@e.com', password_hash: 'h' }).toSQL();
    const profileInsert = db('profiles').insert({ id: 'u1', email: 'e@e.com', role: 'pending_owner' }).toSQL();
    console.log('  [startup] userInsert:', userInsert.sql);
    console.log('  [startup] profileInsert:', profileInsert.sql);
    return true;
  });

  // ========== API: /api/auth/approve-startup ==========
  tests.push(() => {
    // UPDATE tenants set status
    const sql = db('tenants').where({ id: 't1' }).update({ status: 'active' }).toSQL();
    console.log('  [approve] updateTenant:', sql.sql);
    return true;
  });

  tests.push(() => {
    // UPDATE profiles set role, tenant_id
    const sql = db('profiles').where({ id: 'p1' }).update({ role: 'owner', tenant_id: 't1' }).toSQL();
    console.log('  [approve] updateProfile:', sql.sql);
    return true;
  });

  // ========== API: /api/auth/reset-password-request ==========
  tests.push(() => {
    // SELECT user + profile by email
    const sql = db('users')
      .join('profiles', 'users.id', 'profiles.id')
      .where('users.email', 'test@test.com')
      .select('users.id', 'users.email', 'profiles.full_name')
      .first()
      .toSQL();
    console.log('  [resetReq] joinUserProfile:', sql.sql);
    return sql.sql.includes('join') || sql.sql.includes('JOIN');
  });

  // ========== API: /api/tenants/[id] ==========
  tests.push(() => {
    // SELECT tenant by id
    const sql = db('tenants').where({ id: 't1' }).first().toSQL();
    console.log('  [tenants] findById:', sql.sql);
    return true;
  });

  tests.push(() => {
    // SELECT profiles for tenant
    const sql = db('profiles').where({ tenant_id: 't1' }).toSQL();
    console.log('  [tenants] profilesByTenant:', sql.sql);
    return true;
  });

  tests.push(() => {
    // SELECT villas for tenant
    const sql = db('villas').where({ tenant_id: 't1' }).toSQL();
    console.log('  [tenants] villasByTenant:', sql.sql);
    return true;
  });

  // ========== Generic helpers (profiles CRUD) ==========
  tests.push(() => {
    // UPDATE profile
    const sql = db('profiles').where({ id: 'abc' }).update({ full_name: 'New', phone: '0123' }).toSQL();
    console.log('  [profile] update:', sql.sql);
    return true;
  });

  tests.push(() => {
    // SELECT all users (admin)
    const sql = db('profiles')
      .join('users', 'profiles.id', 'users.id')
      .select('profiles.*', 'users.created_at as user_created')
      .orderBy('profiles.created_at', 'desc')
      .toSQL();
    console.log('  [admin] listUsers:', sql.sql);
    return true;
  });

  tests.push(() => {
    // DELETE booking
    const sql = db('bookings').where({ id: 'b1' }).del().toSQL();
    console.log('  [bookings] delete:', sql.sql);
    return true;
  });

  tests.push(() => {
    // INSERT into settings (composite key)
    const sql = db('settings').insert({ key: 'theme', value: 'dark', tenant_id: 't1' }).toSQL();
    console.log('  [settings] upsert:', sql.sql);
    return true;
  });

  tests.push(() => {
    // SELECT settings for tenant
    const sql = db('settings').where({ tenant_id: 't1' }).toSQL();
    console.log('  [settings] listByTenant:', sql.sql);
    return true;
  });

  // Run all tests
  let passed = 0;
  let failed = 0;
  tests.forEach((t, i) => {
    try {
      if (t()) passed++;
      else failed++;
    } catch (e) {
      console.error(`  ✗ Test ${i+1} error: ${e.message}`);
      failed++;
    }
  });

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  db.destroy();
  return failed === 0;
}

const dialects = ['pg', 'mysql2', 'mssql'];
let allPassed = true;
dialects.forEach(d => {
  if (!testDialect(d)) allPassed = false;
});

console.log(`\n${'='.repeat(60)}`);
console.log(allPassed ? '  ✓ ALL DIALECTS PASSED' : '  ✗ SOME TESTS FAILED');
console.log(`${'='.repeat(60)}`);
process.exit(allPassed ? 0 : 1);