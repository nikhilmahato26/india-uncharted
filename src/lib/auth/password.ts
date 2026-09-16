import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

// Compared against when the email doesn't exist, so "no such account" and
// "wrong password" take the same time. Generated once per process.
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hash(crypto.randomUUID(), COST);
  return dummyHash;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(plain, hash ?? (await getDummyHash()));
  return Boolean(hash) && ok;
}

export { PASSWORD_MIN_LENGTH } from "./password-constants";
