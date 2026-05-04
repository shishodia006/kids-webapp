import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  }),
});

await prisma.brand.createMany({
  data: [
    {
      name: "Cafe Coffee Day",
      description: "Partner reward voucher",
      note: "Show voucher at counter",
      points_cost: 250,
      is_active: true,
    },
    {
      name: "Hamleys",
      description: "Partner reward voucher",
      note: "Valid at participating outlet",
      points_cost: 500,
      is_active: true,
    },
  ],
  skipDuplicates: true,
});

const notificationCount = await prisma.notification.count();
if (notificationCount === 0) {
  await prisma.notification.create({
    data: {
      message: "Welcome to Konnectly Kids!",
      type: "announcement",
    },
  });
}

await prisma.$disconnect();
