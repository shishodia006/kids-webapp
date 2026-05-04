import "server-only";

import bcrypt from "bcryptjs";

export async function verifyPhpPassword(password: string, hash: string) {
  if (!password || !hash) return false;

  const normalizedHash = hash.startsWith("$2y$") ? `$2b$${hash.slice(4)}` : hash;
  return bcrypt.compare(password, normalizedHash);
}
