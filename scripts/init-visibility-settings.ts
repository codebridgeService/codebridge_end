import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'codebridge_backend.env' });

import { prisma } from '../src/lib/prisma';

async function initVisibilitySettings() {
  console.log('🔄 Initializing Section Visibility fields on SiteSetting...');
  try {
    const existing = await (prisma as any).siteSetting.findFirst();
    if (existing) {
      const updated = await (prisma as any).siteSetting.update({
        where: { id: existing.id },
        data: {
          showHero: existing.showHero ?? true,
          showServices: existing.showServices ?? true,
          showPackages: existing.showPackages ?? true,
          showProjects: existing.showProjects ?? true,
          showSecurity: existing.showSecurity ?? true,
          showFaq: existing.showFaq ?? true,
          showTeam: existing.showTeam ?? true,
          showHowWeWork: existing.showHowWeWork ?? true,
          showCta: existing.showCta ?? true,
        },
      });
      console.log('✅ Updated site settings with visibility fields:', {
        showHero: updated.showHero,
        showServices: updated.showServices,
        showPackages: updated.showPackages,
        showProjects: updated.showProjects,
        showSecurity: updated.showSecurity,
        showFaq: updated.showFaq,
        showTeam: updated.showTeam,
        showHowWeWork: updated.showHowWeWork,
        showCta: updated.showCta,
      });
    } else {
      console.log('⚠️ No existing siteSetting found to update.');
    }
  } catch (error) {
    console.error('❌ Failed to update visibility fields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initVisibilitySettings();
