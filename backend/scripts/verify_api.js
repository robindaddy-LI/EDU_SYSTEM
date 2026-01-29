
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/sessions/101',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Session ID:', json.session?.id);
            console.log('Teacher Count:', json.attendingTeachers?.length);
            console.log('Student Count:', json.studentAttendance?.length);
            if (json.attendingTeachers?.length > 0) {
                console.log('First Teacher:', json.attendingTeachers[0].teacher.fullName);
            }
            if (json.studentAttendance?.length > 0) {
                console.log('First Student:', json.studentAttendance[0].student.fullName);
            }
        } catch (e) {
            console.log('Response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
