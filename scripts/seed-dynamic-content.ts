import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'codebridge_backend.env' });

import { prisma } from '../src/lib/prisma';

async function seedDynamicContent() {
  console.log('🌱 Starting dynamic content seeding...');

  try {
    // 1. Seed SiteSetting (Singleton)
    const existingSetting = await (prisma as any).siteSetting.findFirst();
    if (!existingSetting) {
      const setting = await (prisma as any).siteSetting.create({
        data: {
          phone: "+855 12 345 678",
          email: "codebridge2026@gmail.com",
          address: "Phnom Penh, Cambodia",
          addressKh: "រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា",
          workingHours: "Mon - Sat: 8:00 AM - 6:00 PM",
          workingHoursKh: "ច័ន្ទ - សៅរ៍: ៨:០០ ព្រឹក - ៦:០០ ល្ងាច",
          facebookUrl: "https://facebook.com",
          telegramUrl: "https://t.me/codebridge",
          tiktokUrl: "https://tiktok.com/@codebridge",
          instagramUrl: "https://instagram.com/codebridge",
          
          heroBadge: "Bridging Businesses with Modern Technology",
          heroBadgeKh: "យើងកំពុងតភ្ជាប់អាជីវកម្មជាមួយបច្ចេកវិទ្យា",
          heroTitle: "We Build Digital Solutions That Grow Your Business",
          heroTitleKh: "យើងកសាងដំណោះស្រាយឌីជីថលដែលជួយពង្រីកអាជីវកម្មរបស់អ្នក",
          heroSubtitle: "Modern websites, cross-platform apps, and enterprise systems tailored to your needs.",
          heroSubtitleKh: "គេហទំព័រទំនើប កម្មវិធីទូរស័ព្ទ និងប្រព័ន្ធគ្រប់គ្រងសហគ្រាសតាមតម្រូវការរបស់អ្នក។",
          heroCtaText: "Explore Services",
          heroCtaTextKh: "ស្វែងយល់សេវាកម្ម",
          heroCtaLink: "/services",

          ctaTitle: "Ready to Transform Your Business?",
          ctaTitleKh: "ត្រៀមខ្លួនរួចរាល់ដើម្បីផ្លាស់ប្តូរអាជីវកម្មរបស់អ្នកហើយឬនៅ?",
          ctaSubtitle: "Let's build your next digital platform together. High speed, reliable code, and stunning aesthetics.",
          ctaSubtitleKh: "តោះសហការកសាងប្រព័ន្ធឌីជីថលរបស់អ្នកជាមួយយើង។ ល្បឿនលឿន កូដដែលអាចទុកចិត្តបាន និងការរចនាដ៏ប្រណិត។",
          ctaBtnText: "Start Project",
          ctaBtnTextKh: "ចាប់ផ្តើមគម្រោង",
          ctaBtnLink: "/contact",

          aboutStory: "We are a dedicated team of innovators and problem-solvers, passionate about building meaningful digital products that empower startups and small businesses. Our focus is on delivering speed, reliability, and exceptionally clean design.",
          aboutStoryKh: "យើងគឺជាក្រុមអ្នកច្នៃប្រឌិត និងអ្នកដោះស្រាយបញ្ហា ដែលមានចំណង់ចំណូលចិត្តក្នុងការបង្កើតផលិតផលឌីជីថលលំដាប់ខ្ពស់ ដើម្បីជួយដល់អាជីវកម្មថ្មីថ្មោង និងខ្នាតតូច។ ការយកចិត្តទុកដាក់របស់យើងគឺលើការផ្តល់ជូននូវល្បឿន ភាពជឿជាក់ និងការរចនាដ៏ស្រស់ស្អាតបំផុត។",
          missionTitle: "Our Mission",
          missionTitleKh: "បេសកកម្មរបស់យើង",
          missionText: "To empower local and international businesses with scalable, high-performance software and exceptional digital experiences.",
          missionTextKh: "ដើម្បីផ្តល់អំណាចដល់អាជីវកម្មក្នុងស្រុក និងអន្តរជាតិ ជាមួយនឹងសូហ្វវែរដែលមានដំណើរការខ្ពស់ និងបទពិសោធន៍ឌីជីថលដ៏អស្ចារ្យ។",
          visionTitle: "Our Vision",
          visionTitleKh: "ចក្ខុវិស័យរបស់យើង",
          visionText: "To become the leading digital engineering agency in Southeast Asia, pioneering transformative technology for growing businesses.",
          visionTextKh: "ក្លាយជាក្រុមហ៊ុនវិស្វកម្មឌីជីថលឈានមុខគេនៅអាស៊ីអាគ្នេយ៍ ដោយត្រួសត្រាយបច្ចេកវិទ្យាផ្លាស់ប្តូរសម្រាប់អាជីវកម្មដែលកំពុងរីកចម្រើន។",
        },
      });
      console.log('✅ Created initial SiteSetting document:', setting.id);
    } else {
      console.log('ℹ️ SiteSetting already exists:', existingSetting.id);
    }

    // 2. Seed FAQs
    const faqCount = await (prisma as any).faq.count();
    if (faqCount === 0) {
      const defaultFaqs = [
        {
          question: "What services does Codebridge provide?",
          questionKh: "តើ Codebridge ផ្តល់សេវាកម្មអ្វីខ្លះ?",
          answer: "We specialize in full-stack web development, mobile applications, custom software solutions, and comprehensive system refactoring using modern technologies like Next.js, Node.js, and MongoDB.",
          answerKh: "យើងជំនាញក្នុងការបង្កើតគេហទំព័រពេញលេញ (full-stack), កម្មវិធីទូរស័ព្ទ, ដំណោះស្រាយកម្មវិធីតាមតម្រូវការ និងការកែសម្រួលប្រព័ន្ធប្រកបដោយប្រសិទ្ធភាពដោយប្រើបច្ចេកវិទ្យាទំនើបៗដូចជា Next.js, Node.js និង MongoDB។",
          category: "General",
          categoryKh: "ទូទៅ",
          order: 1,
        },
        {
          question: "How long does a typical project take?",
          questionKh: "តើគម្រោងមួយជាធម្មតាប្រើរយៈពេលប៉ុន្មាន?",
          answer: "Timeline depends on complexity. Small websites typically take 2-4 weeks, while complex full-stack applications may take 2-4 months. We provide detailed estimates after the initial discovery phase.",
          answerKh: "រយៈពេលអាស្រ័យលើភាពស្មុគស្មាញ។ គេហទំព័រតូចៗជាធម្មតាប្រើពេល ២-៤ សប្តាហ៍ ខណៈពេលដែលកម្មវិធីស្មុគស្មាញអាចចំណាយពេល ២-៤ ខែ។ យើងផ្តល់ការប៉ាន់ស្មានលម្អិតបន្ទាប់ពីដំណាក់កាលសិក្សាដំបូង។",
          category: "General",
          categoryKh: "ទូទៅ",
          order: 2,
        },
        {
          question: "Which programming languages and frameworks do you use?",
          questionKh: "តើអ្នកប្រើភាសាកម្មវិធី និង Framework អ្វីខ្លះ?",
          answer: "Our core stack includes JavaScript/TypeScript (React, Next.js, Node.js, Express), Python, and modern databases including MongoDB and PostgreSQL.",
          answerKh: "ភាសាចម្បងរបស់យើងរួមមាន JavaScript/TypeScript (React, Next.js, Node.js, Express), Python និងប្រព័ន្ធមូលដ្ឋានទិន្នន័យទំនើបរួមមាន MongoDB និង PostgreSQL។",
          category: "Technical",
          categoryKh: "បច្ចេកទេស",
          order: 3,
        },
        {
          question: "Do you offer post-launch maintenance and support?",
          questionKh: "តើអ្នកផ្តល់សេវាកម្មថែទាំ និងគាំទ្របន្ទាប់ពីដាក់ឱ្យដំណើរការដែរឬទេ?",
          answer: "Yes, every package includes dedicated post-launch support, security patches, regular backups, and feature enhancements based on your SLA.",
          answerKh: "បាទ/ចាស! កញ្ចប់នីមួយៗរួមបញ្ចូលទាំងការគាំទ្របន្ទាប់ពីការដាក់ឱ្យដំណើរការ ការធ្វើបច្ចុប្បន្នភាពសុវត្ថិភាព ការបម្រុងទុកទិន្នន័យទៀងទាត់ និងការបន្ថែមមុខងារតាមតម្រូវការ។",
          category: "Pricing",
          categoryKh: "តម្លៃ",
          order: 4,
        },
      ];

      for (const f of defaultFaqs) {
        await (prisma as any).faq.create({ data: f });
      }
      console.log(`✅ Seeded ${defaultFaqs.length} FAQs`);
    } else {
      console.log(`ℹ️ FAQs already seeded (${faqCount} entries)`);
    }

    // 3. Seed How We Work (WorkStep)
    const workStepCount = await (prisma as any).workStep.count();
    if (workStepCount === 0) {
      const defaultSteps = [
        {
          stepNumber: "01",
          title: "Discovery",
          titleKh: "ការស្វែងយល់",
          description: "We listen to your needs, understand your goals and define the project scope.",
          descriptionKh: "យើងស្តាប់តម្រូវការរបស់អ្នក យល់ពីគោលដៅរបស់អ្នក និងកំណត់វិសាលភាពនៃគម្រោង។",
          order: 1,
        },
        {
          stepNumber: "02",
          title: "Design",
          titleKh: "ការរចនា",
          description: "Our UI/UX team creates wireframes and interactive prototypes for your approval.",
          descriptionKh: "ក្រុម UI/UX របស់យើងបង្កើតទម្រង់ដើម និងគំរូសម្រាប់ការយល់ព្រមរបស់អ្នក។",
          order: 2,
        },
        {
          stepNumber: "03",
          title: "Develop",
          titleKh: "ការអភិវឌ្ឍ",
          description: "Our developers build your product with clean, scalable, and high-performance code.",
          descriptionKh: "អ្នកអភិវឌ្ឍន៍របស់យើងបង្កើតផលិតផលរបស់អ្នកជាមួយនឹងកូដស្អាត អាចពង្រីកបាន និងមានល្បឿនលឿន។",
          order: 3,
        },
        {
          stepNumber: "04",
          title: "Test",
          titleKh: "ការសាកល្បង",
          description: "We thoroughly test across devices and fix all issues before production launch.",
          descriptionKh: "យើងធ្វើការសាកល្បងយ៉ាងល្អិតល្អន់លើគ្រប់ឧបករណ៍ និងជួសជុលបញ្ហាទាំងអស់មុនពេលដាក់ឱ្យដំណើរការ។",
          order: 4,
        },
        {
          stepNumber: "05",
          title: "Launch",
          titleKh: "ការដាក់ឱ្យដំណើរការ",
          description: "We deploy your product to high-availability cloud servers and ensure a smooth rollout.",
          descriptionKh: "យើងដាក់ពង្រាយផលិតផលរបស់អ្នកទៅលើម៉ាស៊ីនមេក្លោត និងធានានូវការដាក់ឱ្យដំណើរការដោយរលូន និងជោគជ័យ។",
          order: 5,
        },
      ];

      for (const s of defaultSteps) {
        await (prisma as any).workStep.create({ data: s });
      }
      console.log(`✅ Seeded ${defaultSteps.length} WorkSteps`);
    } else {
      console.log(`ℹ️ WorkSteps already seeded (${workStepCount} entries)`);
    }

    // 4. Seed SecurityFeatures
    const securityCount = await (prisma as any).securityFeature.count();
    if (securityCount === 0) {
      const defaultSecFeatures = [
        {
          title: "End-to-End Encryption",
          titleKh: "ការបំប្លែងកូដពីចុងម្ខាងទៅចុងម្ខាង",
          description: "Your data is secured using industry-standard AES-256 encryption protocols during transit and at rest.",
          descriptionKh: "ទិន្នន័យរបស់អ្នកត្រូវបានធានាសុវត្ថិភាពដោយប្រើពិធីការបំប្លែងកូដ AES-256 ស្តង់ដារឧស្សាហកម្ម។",
          icon: "LockClosedIcon",
          color: "#3B82F6",
          order: 1,
        },
        {
          title: "Secure Cloud Infrastructure",
          titleKh: "ហេដ្ឋារចនាសម្ព័ន្ធក្លោតប្រកបដោយសុវត្ថិភាព",
          description: "Leveraging globally distributed, enterprise-grade cloud servers with 99.9% uptime and DDoS protection.",
          descriptionKh: "ប្រើប្រាស់ម៉ាស៊ីនមេក្លោតកម្រិតសហគ្រាស ជាមួយនឹងពេលវេលាដំណើរការ 99.9% និងការការពារ DDoS ។",
          icon: "CloudIcon",
          color: "#6366F1",
          order: 2,
        },
        {
          title: "Privacy by Design",
          titleKh: "ឯកជនភាពតាមរយៈការរចនា",
          description: "Built-in compliance with data protection regulations ensuring your user information remains confidential.",
          descriptionKh: "ការអនុលោមតាមបទប្បញ្ញត្តិការពារទិន្នន័យដែលធានាថាព័ត៌មានអ្នកប្រើប្រាស់នៅតែជាឯកជន និងសម្ងាត់។",
          icon: "ShieldCheckIcon",
          color: "#10B981",
          order: 3,
        },
        {
          title: "Continuous Monitoring",
          titleKh: "ការត្រួតពិនិត្យជាប្រចាំ ២៤/៧",
          description: "24/7 security auditing, automated vulnerability scans, and Attack Shield DDoS mitigation.",
          descriptionKh: "ការត្រួតពិនិត្យសុវត្ថិភាព ២៤/៧ ការស្កេនរកភាពងាយរងគ្រោះដោយស្វ័យប្រវត្តិ និងការការពារពី Attack Shield ។",
          icon: "FingerPrintIcon",
          color: "#8B5CF6",
          order: 4,
        },
      ];

      for (const sec of defaultSecFeatures) {
        await (prisma as any).securityFeature.create({ data: sec });
      }
      console.log(`✅ Seeded ${defaultSecFeatures.length} SecurityFeatures`);
    } else {
      console.log(`ℹ️ SecurityFeatures already seeded (${securityCount} entries)`);
    }

    console.log('🎉 All dynamic content seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedDynamicContent();
