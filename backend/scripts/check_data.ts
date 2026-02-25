
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Global Data Status ---');

    console.log('\n1. Student Counts by Class ID:');
    const students = await prisma.student.groupBy({
        by: ['classId'],
        _count: { id: true },
        orderBy: { classId: 'asc' }
    });
    // Type the returned aggregation
    console.table(students.map((s: { classId: number | null; _count: { id: number } }) => ({ classId: s.classId, count: s._count.id })));

    console.log('\n2. Teacher Assignments by Academic Year:');
    // For older Prisma versions, orderBy in groupBy might be restricted. Removing orderBy for safety.
    const assignments = await prisma.teacherClassAssignment.groupBy({
        by: ['academicYear', 'classId'],
        _count: { teacherId: true }
    });
    console.table(assignments.map((a: { academicYear: string; classId: number; _count: { teacherId: number } }) => ({ year: a.academicYear, classId: a.classId, teachers: a._count.teacherId })));

    console.log('\n3. Class Sessions by Date Range (Recent):');
    const sessions = await prisma.classSession.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: { _count: { select: { studentAttendance: true, teacherAttendance: true } } }
    });

    console.log('Recent Sessions:');
    sessions.forEach((s: { id: number; date: Date; classId: number; _count: { studentAttendance: number; teacherAttendance: number } }) => {
        console.log(`[${s.id}] ${s.date.toISOString().split('T')[0]} (Class ${s.classId}) - Att: ${s._count.studentAttendance} Students, ${s._count.teacherAttendance} Teachers`);
    });

    console.log('\n4. Academic Year Calculation Test:');
    const testDate = new Date();
    // Month is 0-indexed
    const ay = testDate.getMonth() >= 8 ? testDate.getFullYear() : testDate.getFullYear() - 1;
    console.log(`Current Date: ${testDate.toISOString()}, Calculated Current AY: ${ay}`);

}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
