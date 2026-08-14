import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const services = await prisma.service.findMany();
    console.log("Services:", services);
  } catch (e) {
    console.error("Error connecting or fetching:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
