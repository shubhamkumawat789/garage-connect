import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

async function run() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool as any);
    const prisma = new PrismaClient({ adapter });

    console.log("Checking for user: shubhamkumawat722@gmail.com");
    
    const user = await prisma.user.findFirst({
        where: {
            email: {
                contains: 'shubhamkumawat722',
                mode: 'insensitive'
            }
        }
    });

    if (user) {
        console.log("Found User:", {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName
        });
    } else {
        console.log("User NOT FOUND in database.");
        
        // Let's check all users to see if anything is there
        const allUsers = await prisma.user.findMany({
            select: { email: true, role: true },
            take: 10
        });
        console.log("Existing users in DB (sample):", allUsers);
    }

    await prisma.$disconnect();
}

run();
