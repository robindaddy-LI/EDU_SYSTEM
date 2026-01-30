const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== All Teacher Assignments ===\n');

    const assignments = await prisma.teacherClassAssignment.findMany({
        include: { teacher: true, class: true }
    });

    console.log(`Total assignments: ${assignments.length}\n`);

    // Group by class
    const byClass = {};
    assignments.forEach(a => {
        if (!byClass[a.classId]) {
            byClass[a.classId] = [];
        }
        byClass[a.classId].push(a);
    });

    Object.entries(byClass).forEach(([classId, assigns]) => {
        console.log(`Class ${classId} (${assigns[0].class.name}):`);
        assigns.forEach(a => {
            console.log(`  - ${a.teacher.fullName} (Year: ${a.academicYear}, Lead: ${a.isLead})`);
        });
        console.log('');
    });

    // Check which classes have no assignments
    const allClasses = await prisma.class.findMany();
    console.log('Classes without assignments:');
    allClasses.forEach(c => {
        if (!byClass[c.id]) {
            console.log(`  - Class ${c.id}: ${c.name}`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
