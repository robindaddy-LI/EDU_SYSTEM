
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function simulateFrontend() {
    try {
        console.log('--- Simulating Frontend Data Fetch ---');

        // 1. Fetch Classes
        console.log('1. Fetching Classes...');
        const classesRes = await axios.get(`${API_URL}/classes`);
        const classes = classesRes.data;
        console.log(`   Got ${classes.length} classes.`);

        // 2. Fetch Active Teachers
        console.log('2. Fetching Active Teachers...');
        const teachersRes = await axios.get(`${API_URL}/teachers`, { params: { status: 'active' } });
        const teachers = teachersRes.data;
        console.log(`   Got ${teachers.length} active teachers.`);

        // 3. Fetch Assignments for 2026 (Default Year)
        const academicYear = '2026';
        console.log(`3. Fetching Assignments for year ${academicYear}...`);
        const assignmentsRes = await axios.get(`${API_URL}/teacher-assignments`, { params: { academicYear } });
        const assignmentData = assignmentsRes.data;
        console.log(`   Got ${assignmentData.length} assignments.`);

        // 4. Client-side Mapping Logic
        console.log('4. Performing Map...');
        if (classes.length === 0) {
            console.log('   WARNING: Classes array is empty! This would cause empty UI.');
        } else {
            const initialRows = classes.map((cls: { id: number; name: string }) => {
                const classAssignments = assignmentData.filter((a: { classId: number }) => a.classId === cls.id);
                return {
                    classId: cls.id,
                    className: cls.name,
                    teachersCount: classAssignments.length
                };
            });
            console.log('   Mapped Rows (First 3):', initialRows.slice(0, 3));
        }

    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error('   ERROR:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            }
        } else if (error instanceof Error) {
            console.error('   ERROR:', error.message);
        } else {
            console.error('   ERROR:', error);
        }
    }
}

simulateFrontend();
