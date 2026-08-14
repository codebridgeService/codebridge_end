import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Admin User';

  if (!email || !password) {
    console.error('Usage: npx ts-node scripts/create-admin.ts <email> <password> [name]');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'admin',
        name: name || undefined,
        isLocked: false,
        lockoutUntil: null,
        failedLoginAttempts: 0,
      },
      create: {
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        isLocked: false,
        failedLoginAttempts: 0,
      },
    });

    console.log(`✅ Successfully set/updated admin user: ${user.email} (ID: ${user.id})`);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
