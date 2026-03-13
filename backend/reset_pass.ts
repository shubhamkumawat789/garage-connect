import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from 'bcryptjs';

async function run() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool as any);
    const prisma = new PrismaClient({ adapter });

    const email = 'shubhamkumawat722@gmail.com';
    const newPasswordHash = await bcrypt.hash('password123', 10);

    console.log(`Resetting password for ${email}...`);
    
    await prisma.user.update({
        where: { email },
        data: { passwordHash: newPasswordHash }
    });

    console.log("Password reset successful to: password123");

    await prisma.$disconnect();
}

run();
