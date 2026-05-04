import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForDb = globalThis as typeof globalThis & {
  konnectlyPrisma?: PrismaClient;
};

export type DbRow = Record<string, unknown>;
export type DbResult = { affectedRows: number };
type DbValues = unknown[];
type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export type DbConnection = {
  execute: (sql: string, values?: DbValues) => Promise<[DbResult]>;
  queryRows: <T extends DbRow = DbRow>(sql: string, values?: DbValues) => Promise<T[]>;
  queryOne: <T extends DbRow = DbRow>(sql: string, values?: DbValues) => Promise<T | null>;
};

export function getDbPool() {
  return getPrisma();
}

export function getPrisma() {
  if (!globalForDb.konnectlyPrisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured. Add your Supabase PostgreSQL URL to .env.local.");
    }

    globalForDb.konnectlyPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
      }),
    });
  }

  return globalForDb.konnectlyPrisma;
}

export async function queryRows<T extends DbRow = DbRow>(sql: string, values: DbValues = []) {
  return runQueryRows<T>(getPrisma(), sql, values);
}

export async function queryOne<T extends DbRow = DbRow>(sql: string, values: DbValues = []) {
  const rows = await queryRows<T>(sql, values);
  return rows[0] ?? null;
}

export async function executeQuery(sql: string, values: DbValues = []) {
  const affectedRows = await getPrisma().$executeRawUnsafe(normalizeSql(sql), ...normalizeValues(values));
  return { affectedRows };
}

export async function withTransaction<T>(callback: (connection: DbConnection) => Promise<T>) {
  return getPrisma().$transaction(async (tx) => callback(makeConnection(tx)));
}

export async function checkDbConnection() {
  const row = await queryOne<{ ok: number }>("SELECT 1 AS ok");
  return Number(row?.ok) === 1;
}

function makeConnection(client: PrismaTx): DbConnection {
  const connection: DbConnection = {
    async execute(sql, values = []) {
      const affectedRows = await client.$executeRawUnsafe(normalizeSql(sql), ...normalizeValues(values));
      return [{ affectedRows }];
    },
    queryRows(sql, values = []) {
      return runQueryRows(client, sql, values);
    },
    async queryOne<T extends DbRow = DbRow>(sql: string, values: DbValues = []): Promise<T | null> {
      const rows = await runQueryRows<T>(client, sql, values);
      return rows[0] ?? null;
    },
  };

  return connection;
}

async function runQueryRows<T extends DbRow>(client: PrismaClient | PrismaTx, sql: string, values: DbValues) {
  return client.$queryRawUnsafe<T[]>(normalizeSql(sql), ...normalizeValues(values));
}

function normalizeSql(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function normalizeValues(values: DbValues) {
  return values.map((value) => {
    if (value instanceof Date) return value;
    if (typeof value === "boolean") return value;
    if (value == null) return value;
    if (typeof value === "number" || typeof value === "bigint") return value;
    if (typeof value === "object" && Prisma.Decimal.isDecimal(value)) return value;
    return value;
  });
}
