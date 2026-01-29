import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;


import classSessionsRouter from './routes/classSessions';
import studentsRouter from './routes/students';
import teachersRouter from './routes/teachers';
import classesRouter from './routes/classes';
import usersRouter from './routes/users';

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.url}`);
    next();
});

app.use('/api/v1/sessions', classSessionsRouter);
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/teachers', teachersRouter);
app.use('/api/v1/classes', classesRouter);
app.use('/api/v1/users', usersRouter);

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
    console.log('Health check: Endpoint hit');
    try {
        console.log('Health check: Executing raw query...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('Health check: Query success');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error('Health check: Query failed', error);
        res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
    }
});


app.get('/', (req, res) => {
    res.send('Education System API is running!');
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, closing Prisma connection...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing Prisma connection...');
    await prisma.$disconnect();
    process.exit(0);
});


const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('--- Prisma Connected Successfully ---');

        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to database:', error);
        process.exit(1);
    }
};

startServer();

