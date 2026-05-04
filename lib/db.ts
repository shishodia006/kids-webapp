import "server-only";

import mysql, { type Pool, type PoolConnection, type PoolOptions, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

const globalForDb = globalThis as typeof globalThis & {
  konnectlyDbPool?: Pool;
};

export type DbRow = RowDataPacket;
export type DbResult = ResultSetHeader;
type DbValues = NonNullable<Parameters<Pool["execute"]>[1]>;

export function getDbPool() {
  if (!globalForDb.konnectlyDbPool) {
    globalForDb.konnectlyDbPool = mysql.createPool(getDbConfig());
  }

  return globalForDb.konnectlyDbPool;
}

export async function queryRows<T extends DbRow = DbRow>(sql: string, values: DbValues = []) {
  const [rows] = await getDbPool().execute<T[]>(sql, values);
  return rows;
}

export async function queryOne<T extends DbRow = DbRow>(sql: string, values: DbValues = []) {
  const rows = await queryRows<T>(sql, values);
  return rows[0] ?? null;
}

export async function executeQuery(sql: string, values: DbValues = []) {
  const [result] = await getDbPool().execute<DbResult>(sql, values);
  return result;
}

export async function withTransaction<T>(callback: (connection: PoolConnection) => Promise<T>) {
  const connection = await getDbPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkDbConnection() {
  const row = await queryOne<{ ok: number } & DbRow>("SELECT 1 AS ok");
  return row?.ok === 1;
}

function getDbConfig(): PoolOptions {
  const host = process.env.DB_HOST ?? "localhost";
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const port = Number(process.env.DB_PORT ?? "3306");

  if (!database || !user) {
    throw new Error("Database is not configured. Set DB_NAME, DB_USER, and DB_PASSWORD.");
  }

  return {
    host,
    database,
    user,
    password,
    port,
    charset: process.env.DB_CHARSET ?? "utf8mb4",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? "10"),
    queueLimit: 0,
    namedPlaceholders: false,
    timezone: "Z",
  };
}
