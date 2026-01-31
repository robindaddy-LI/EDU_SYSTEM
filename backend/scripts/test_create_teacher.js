
const http = require('http');

const data = JSON.stringify({
    fullName: "Test Teacher " + Date.now(),
    teacherType: "formal",
    status: "active",
    phone: "123456789",
    email: "test@example.com",
    notes: "Test note"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/teachers',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

console.log('Sending request to http://localhost:3000/api/teachers');
console.log('Payload:', data);

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log('Response Body:', body);
    });
});

req.on('error', (error) => {
    console.error('Request Error:', error);
});

req.write(data);
req.end();
