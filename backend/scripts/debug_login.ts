
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        const users = await prisma.user.findMany();
        console.log('--- User List ---');
        if (users.length === 0) {
            console.log('No users found in the database. You might need to run the seed script.');
        } else {
            users.forEach(u => {
                console.log(`ID: ${u.id}, Username: '${u.username}', PasswordHash: '${u.passwordHash}', Role: '${u.role}', Status: '${u.status}'`);
            });
        }
        console.log('-----------------');
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
