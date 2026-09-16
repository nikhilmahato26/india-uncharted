import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * The only place a PrismaClient is constructed. Reused across hot reloads in
 * development so the local Postgres doesn't run out of connections.
 */
const globalForDb = globalThis as unknown as { __iuPrisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const db: PrismaClient = globalForDb.__iuPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForDb.__iuPrisma = db;
