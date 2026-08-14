import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'codebridge@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admincode123';

  console.log('Seeding admin user...');

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'admin',
    },
    create: {
      email: adminEmail,
      name: 'Admin Codebridge',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('Admin user seeded:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
