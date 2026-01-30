
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const studentCount = await prisma.student.count();
    const classCount = await prisma.classSession.count(); // Adjust model name if needed, guessing based on file names

    console.log(`Users: ${userCount}`);
    console.log(`Students: ${studentCount}`);
    console.log(`Classes: ${classCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
