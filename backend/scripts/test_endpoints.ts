
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testEndpoints() {
    try {
        console.log('Testing /classes...');
        const classes = await axios.get(`${API_URL}/classes`);
        console.log(`Classes count: ${classes.data.length}`);
        if (classes.data.length > 0) {
            console.log('Sample Class:', classes.data[0]);
        }

        console.log('\nTesting /teachers...');
        const teachers = await axios.get(`${API_URL}/teachers`);
        console.log(`Teachers count: ${teachers.data.length}`);
        if (teachers.data.length > 0) {
            console.log('Sample Teacher:', teachers.data[0]);
        }

    } catch (error: any) {
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testEndpoints();
