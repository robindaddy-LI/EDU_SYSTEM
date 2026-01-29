import { PrismaClient } from '@prisma/client';

console.log('--- Initializing Centralized Prisma Client ---');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty'
});
console.log('--- Prisma Client Initialized ---');

export default prisma;
