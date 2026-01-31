
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // List of table names as mapped in schema.prisma
    const tables = [
        'users',
        'classes',
        'students',
        'teachers',
        'teacher_class_assignments',
        'class_sessions',
        'student_attendance',
        'teacher_attendance',
        'operation_logs'
    ];

    console.log('--- Fixing PostgreSQL Sequences ---');

    for (const table of tables) {
        try {
            // Check if table exists or just try to update sequence
            // This query sets the sequence to the next available ID
            const result = await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id)+1, 1), false) FROM "${table}";
      `);
            console.log(`✅ Fixed sequence for table: ${table}`);
        } catch (e) {
            console.error(`❌ Failed to fix ${table}: ${e.message}`);
            // Some tables might not have an 'id' column or sequence, ignore if so (though our schema has ids for all)
        }
    }

    console.log('--- Done ---');
}

main()
    .catch(e => {
        console.error('Fatal Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
