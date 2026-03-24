import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("CRITICAL: DATABASE_URL is not defined in process.env!");
} else {
  console.log("Database connection string present.");
}

const pool = new Pool({ 
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

export default prisma;
