import 'dotenv/config';
import { prisma } from './prisma.js';

console.log('ALMX permanece vazio: nenhum dado inicial foi criado.');
await prisma.$disconnect();
