
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Current Time:", new Date().toISOString());
    console.log("--- Testing Teacher Assignments in DB ---");

    try {
        const all = await prisma.teacherClassAssignment.findMany({
            include: { teacher: true, class: true }
        });
        console.log(`Total assignments found: ${all.length}`);

        all.forEach(a => {
            console.log(`ID: ${a.id}, Year: ${a.academicYear}, Class: ${a.classId} (${a.class?.name}), Teacher: ${a.teacher?.fullName}, isLead: ${a.isLead}`);
        });

        console.log("\n--- Testing Backend Filtering Logic (Simulation) ---");

        // Simulating the query done by the controller
        const academicYear = "2025"; // Assume 2025 based on hypothesis
        const classId = 1; // Assume class 1 exists

        console.log(`Simulating query for Year: ${academicYear}, ClassId: ${classId}`);
        const filtered = await prisma.teacherClassAssignment.findMany({
            where: {
                academicYear: academicYear,
                classId: classId
            }
        });
        console.log(`Filtered result count: ${filtered.length}`);

        console.log("\n--- Testing with Current Date Year ---");
        const currentYear = new Date().getFullYear().toString();
        console.log(`Simulating query for Year: ${currentYear}, ClassId: ${classId}`);
        const filteredCurrent = await prisma.teacherClassAssignment.findMany({
            where: {
                academicYear: currentYear,
                classId: classId
            }
        });
        console.log(`Filtered result count (Current Year): ${filteredCurrent.length}`);

    } catch (e) {
        console.error("Error executing query:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
