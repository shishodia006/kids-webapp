import "server-only";

import bcrypt from "bcryptjs";
import { executeQuery } from "@/lib/db";

export const ADMIN_EMAIL = "admin@konnectly.com";
export const ADMIN_PASSWORD = "Admin@123";

export function isAdminCredentials(email: unknown, password: unknown) {
  return (
    typeof email === "string" &&
    typeof password === "string" &&
    email.trim().toLowerCase() === ADMIN_EMAIL &&
    password === ADMIN_PASSWORD
  );
}

export async function ensureAdminAccount() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await executeQuery(
    `
    INSERT INTO users
      (email, mobile, password, parent_name, role)
    VALUES
      (?, ?, ?, 'Konnectly Admin', 'admin')
    ON CONFLICT (email)
    DO UPDATE SET
      mobile = EXCLUDED.mobile,
      password = EXCLUDED.password,
      parent_name = EXCLUDED.parent_name,
      role = 'admin',
      updated_at = NOW()
    `,
    [ADMIN_EMAIL, ADMIN_EMAIL, passwordHash],
  );
}
