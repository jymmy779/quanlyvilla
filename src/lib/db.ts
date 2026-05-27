import knex, { Knex } from 'knex';

function createDb(): Knex {
  const client = process.env.DB_CLIENT || 'mysql2'; // mysql2 | mssql | pg

  const baseConfig: Knex.Config = {
    client,
    pool: { min: 0, max: 10 },
  };

  if (client === 'mysql2') {
    return knex({
      ...baseConfig,
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentify',
      },
    });
  }

  if (client === 'mssql') {
    return knex({
      ...baseConfig,
      connection: {
        server: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '1433', 10),
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentify',
        options: {
          instanceName: process.env.DB_INSTANCE || undefined,
          trustServerCertificate: true,
        },
      },
    });
  }

  // PostgreSQL fallback
  return knex({
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rentify',
    },
  });
}

const db = createDb();

export default db;