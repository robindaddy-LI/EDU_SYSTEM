
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/teachers';

async function testCreateTeacher() {
    try {
        console.log('Testing Create Teacher...');
        const payload = {
            fullName: "Test Teacher " + Date.now(),
            teacherType: "formal",
            status: "active",
            phone: "123456789",
            email: "test@example.com",
            notes: "Test note"
        };
        console.log('Payload:', payload);

        const response = await axios.post(API_URL, payload);
        console.log('Success:', response.status, response.data);
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testCreateTeacher();
