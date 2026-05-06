import "server-only";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { executeQuery, queryOne, queryRows, type DbRow } from "@/lib/db";
import type { AuthRole } from "@/lib/auth/session";

export type RegisterDetails = {
  fatherName: string;
  motherName: string;
  email: string;
  password: string;
  phone: string;
  alternateMobile: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  childName: string;
  childAge: number;
  school: string;
  referralCode: string;
};

export type ParentSignupDetails = {
  fatherName: string;
  motherName: string;
  fullName: string;
  email: string;
  phone: string;
  alternateMobile: string;
  address: string;
  cityArea: string;
  pincode: string;
  referralCode: string;
};

type AnyRow = DbRow & Record<string, unknown>;

export async function findUserByPhone(phone: string) {
  return queryOne<AnyRow>("SELECT * FROM users WHERE mobile = ? LIMIT 1", [phone]);
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return queryOne<AnyRow>("SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1", [normalized]);
}

export async function assertCanLogin(phone: string, password: unknown) {
  const rawPassword = typeof password === "string" ? password : "";
  const user = await findUserByPhone(phone);

  if (!user) {
    return { ok: false as const, message: "This WhatsApp number is not registered. Please create an account first." };
  }

  const passwordHash = stringValue(user.password);
  if (!rawPassword || !passwordHash) {
    return { ok: false as const, message: "Please enter your mobile number and password." };
  }

  const isValid = await bcrypt.compare(rawPassword, passwordHash);
  if (!isValid) {
    return { ok: false as const, message: "Invalid mobile number or password." };
  }

  return { ok: true as const, role: normalizeAccountRole(user.role) };
}

export async function assertCanRegister(phone: string, referralCode: unknown) {
  const existing = await findUserByPhone(phone);
  if (existing) {
    return { ok: false as const, message: "This WhatsApp number is already registered. Please login instead." };
  }

  const code = typeof referralCode === "string" ? referralCode.trim().toUpperCase() : "";
  if (!code) return { ok: true as const };

  const referrer = await findReferrerByCode(code);
  if (!referrer) return { ok: false as const, message: "Referral code not found. Please check it or leave it blank." };

  return { ok: true as const };
}

export async function assertEmailAvailable(email: unknown) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalized) return { ok: true as const };

  const existing = await findUserByEmail(normalized);
  if (existing) {
    return { ok: false as const, message: "This email is already registered. Please login or use another email." };
  }

  return { ok: true as const };
}

export async function createParentAccount(details: ParentSignupDetails) {
  const existing = await findUserByPhone(details.phone);
  if (existing) return Number(existing.id);

  const parentName = details.fullName || [details.fatherName, details.motherName].filter(Boolean).join(" & ") || "Konnectly Parent";
  const locality = details.cityArea;
  const kode = await generateParentReferralCode(parentName);

  const inserted = await queryOne<{ id: number }>(
    `
    INSERT INTO users
      (email, mobile, password, parent_name, father_name, mother_name, alternate_mobile, address, locality, city, pincode, block_sector, konnekt_kode, role)
    VALUES
      (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')
    RETURNING id
    `,
    [
      details.email || null,
      details.phone,
      parentName,
      details.fatherName || null,
      details.motherName || null,
      details.alternateMobile || null,
      details.address || null,
      locality || null,
      locality || null,
      details.pincode || null,
      details.referralCode || null,
      kode,
    ],
  );

  const parentId = Number(inserted?.id);

  if (!parentId) {
    throw new Error("Account creation failed. Parent ID not generated.");
  }

  return parentId;
}

export async function setParentPassword(phone: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await executeQuery("UPDATE users SET password = ? WHERE mobile = ?", [passwordHash, phone]);
  if (!result.affectedRows) throw new Error("Account not found.");
}

export async function createRegisteredFamily(details: RegisterDetails) {
  const existing = await findUserByPhone(details.phone);
  if (existing) return Number(existing.id);

  const parentName =
    [details.fatherName, details.motherName].filter(Boolean).join(" & ") ||
    "Konnectly Parent";

  const kode = await generateParentReferralCode(parentName);
  const passwordHash = await bcrypt.hash(details.password, 10);
  const childAge = Number.isFinite(details.childAge) ? details.childAge : 0;
  const referrer = details.referralCode
    ? await findReferrerByCode(details.referralCode)
    : null;

  const inserted = await queryOne<{ id: number }>(
    `
    INSERT INTO users
      (email, mobile, password, parent_name, child_name, age, block_sector, konnekt_kode, role)
    VALUES
      (?, ?, ?, ?, ?, ?, '', ?, 'user')
    RETURNING id
    `,
    [
      details.email || null,
      details.phone,
      passwordHash,
      parentName,
      details.childName,
      childAge,
      kode,
    ]
  );

  const parentId = Number(inserted?.id);

  if (!parentId) {
    throw new Error("Account creation failed. Parent ID not generated.");
  }

  try {
    await executeQuery(
      `
      UPDATE users
      SET
        address = ?,
        city = ?,
        state = ?,
        pincode = ?,
        father_name = ?,
        mother_name = ?,
        alternate_mobile = ?,
        locality = ?
      WHERE id = ?
      `,
      [
        details.address,
        details.city,
        details.state,
        details.pincode,
        details.fatherName,
        details.motherName,
        details.alternateMobile,
        details.locality,
        parentId,
      ]
    );
  } catch (error) {
    console.warn("Optional user profile fields update skipped:", error);
  }

  if (details.childName) {
    try {
      await executeQuery(
        `
        INSERT INTO kids
          (parent_id, child_name, age, school, block_rank, status, konnekt_points)
        VALUES
          (?, ?, ?, ?, 'Newbie', 'pending', 100)
        `,
        [parentId, details.childName, childAge, details.school]
      );
    } catch {
      await executeQuery(
        `
        INSERT INTO kids
          (parent_id, child_name, age, block_rank, status)
        VALUES
          (?, ?, ?, 'Newbie', 'pending')
        `,
        [parentId, details.childName, childAge]
      );
    }
  }

  if (referrer?.parentId) {
    await awardReferralBonus(
      referrer.parentId,
      parentId,
      referrer.referralCode
    );
  }

  return parentId;
}

async function generateParentReferralCode(parentName: string) {
  const base = parentName.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "KON";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `KP-${base}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const existing = await queryOne<AnyRow>(
      "SELECT 1 AS found FROM users WHERE konnekt_kode = ? UNION SELECT 1 AS found FROM kids WHERE konnekt_kode = ? LIMIT 1",
      [code, code],
    );
    if (!existing) return code;
  }

  return `KP-${base}-${Date.now().toString(36).toUpperCase()}`;
}

async function findReferrerByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const parent = await queryOne<AnyRow>(
    "SELECT id AS parent_id, konnekt_kode AS referral_code FROM users WHERE UPPER(konnekt_kode) = ? LIMIT 1",
    [normalized],
  );
  if (parent) return { parentId: Number(parent.parent_id), referralCode: stringValue(parent.referral_code) };

  const kid = await queryOne<AnyRow>(
    `SELECT u.id AS parent_id, k.konnekt_kode AS referral_code
     FROM kids k
     JOIN users u ON u.id = k.parent_id
     WHERE UPPER(k.konnekt_kode) = ?
     LIMIT 1`,
    [normalized],
  );
  if (kid) return { parentId: Number(kid.parent_id), referralCode: stringValue(kid.referral_code) };

  return null;
}

async function awardReferralBonus(referrerParentId: number, referredParentId: number, referralCode: string) {
  if (!referrerParentId || referrerParentId === referredParentId) return;

  const kids = await queryRows<AnyRow>("SELECT id FROM kids WHERE parent_id = ? ORDER BY id ASC", [referrerParentId]);
  if (!kids.length) return;

  const points = 50;
  await executeQuery("UPDATE users SET konnect_points = konnect_points + ? WHERE id = ?", [points, referrerParentId]);
  const baseShare = Math.floor(points / kids.length);
  const remainder = points % kids.length;

  for (const [index, kid] of kids.entries()) {
    const share = baseShare + (index < remainder ? 1 : 0);
    if (share > 0) {
      await executeQuery("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ?", [share, Number(kid.id)]);
    }
  }

  const referredKid = await queryOne<AnyRow>("SELECT id FROM kids WHERE parent_id = ? ORDER BY id ASC LIMIT 1", [referredParentId]);
  if (referredKid?.id) {
    await executeQuery("UPDATE users SET konnect_points = konnect_points + ? WHERE id = ?", [points, referredParentId]);
    await executeQuery("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ?", [points, Number(referredKid.id)]);
    try {
      await executeQuery(
        "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type, ref_id) VALUES (?, ?, 'referral_welcome_bonus', ?, ?, 'referral', ?)",
        [referredParentId, Number(referredKid.id), points, "Welcome bonus for joining Konnectly through a referral.", referrerParentId],
      );
    } catch {
      // Older DBs may not have point_ledger yet. The point balances are the important side effect.
    }
  }

  try {
    await executeQuery(
      "INSERT INTO referral_rewards (referrer_parent_id, referred_parent_id, referral_code, points_awarded) VALUES (?, ?, ?, ?)",
      [referrerParentId, referredParentId, referralCode, points],
    );
  } catch {
    // Older DBs may not have referral_rewards yet. Points are the important side effect.
  }
}

function stringValue(value: unknown) {
  return value == null ? "" : String(value);
}

function normalizeAccountRole(value: unknown): AuthRole {
  const role = stringValue(value);
  if (role === "admin" || role === "brand") return role;
  return "user";
}
