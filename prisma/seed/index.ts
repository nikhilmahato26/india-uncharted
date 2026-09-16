/**
 * Seeds what the migration can't infer: the first admin account and the
 * homepage composition. Re-runnable — sections are replaced, never duplicated.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "../../src/generated/prisma/client";
import { homeSections } from "./home-sections";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!email || !password) {
    console.log("skip admin: set SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD");
    return;
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`admin exists: ${email}`);
    return;
  }
  await db.user.create({
    data: { email, name: "India Uncharted", passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN" },
  });
  console.log(`admin created: ${email} — change this password after the first sign-in`);
}

async function main() {
  await seedSuperAdmin();

  const page = await db.page.findUnique({ where: { key: "home" }, select: { id: true } });
  if (!page) {
    console.log("skip home sections: run `npm run wp:import` first");
    return;
  }
  const sections = await homeSections(db);
  await db.section.deleteMany({ where: { ownerType: "PAGE", ownerId: page.id } });
  await db.section.createMany({
    data: sections.map((s, i) => ({ ownerType: "PAGE" as const, ownerId: page.id, type: s.type, props: s.props as Prisma.InputJsonValue, sortOrder: i, isVisible: true })),
  });
  console.log(`home sections: ${sections.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
