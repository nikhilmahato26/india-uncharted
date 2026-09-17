import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

/** Scripts talk to whatever DATABASE_URL points at — today, the Neon preview. */
export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
export const target = (process.env.DATABASE_URL ?? "").includes("neon.tech") ? "Neon (client preview)" : "local Postgres";
