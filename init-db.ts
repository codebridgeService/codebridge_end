import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const collections = [
    'users',
    'services',
    'packages',
    'team_members',
    'password_reset_tokens',
    'contact_messages',
    'projects',
    'project_requests'
  ];

  for (const coll of collections) {
    try {
      await prisma.$runCommandRaw({ create: coll });
      console.log(`Created collection: ${coll}`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log(`Collection ${coll} already exists.`);
      } else {
        console.error(`Error creating ${coll}:`, e.message || e);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
