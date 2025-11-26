// test-simple.js
const { PrismaClient } = require('@prisma/client');

console.log('Starting database test...');

const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('✅ Connected to database!');
    return prisma.$queryRaw`SELECT 1 as test`;
  })
  .then((result) => {
    console.log('✅ Query test passed:', result);
    return prisma.$disconnect();
  })
  .then(() => {
    console.log('🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  });