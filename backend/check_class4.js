const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking Class 4 (國中班) ===\n');

    // Check class info
    const classInfo = await prisma.class.findUnique({ where: { id: 4 } });
    console.log('Class:', classInfo);

    // Check students
    const students = await prisma.student.findMany({
        where: { classId: 4, status: 'active' }
    });
    console.log('\nActive Students:', students.length);
    students.forEach(s => console.log(`  - ${s.fullName} (ID: ${s.id})`));

    // Check teacher assignments
    const assignments = await prisma.teacherClassAssignment.findMany({
        where: { classId: 4, academicYear: '2024' },
        include: { teacher: true }
    });
    console.log('\nTeacher Assignments (2024):', assignments.length);
    assignments.forEach(a => console.log(`  - ${a.teacher.fullName} (ID: ${a.teacher.id}, Lead: ${a.isLead})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
