import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Global patch for BigInt JSON serialization (Prisma returns BigInt for bigint fields,
// which causes TypeError: Do not know how to serialize a BigInt in NextResponse.json)
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

import { Pool } from "pg";

function createClient() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1, // Limit each serverless function to exactly 1 connection to prevent EMAXCONN pool exhaustion
    idleTimeoutMillis: 10000, // Close idle connections after 10 seconds to release them quickly back to the database pool
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Save to globalThis in both development and production to reuse connections across serverless warm containers
globalForPrisma.prisma = prisma;

// Triggered client reload after schema sync

