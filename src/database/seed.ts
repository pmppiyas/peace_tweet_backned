import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SEED_ADMIN_USER, SEED_CATEGORIES, SEED_DUAS, SEED_SOURCES } from '../data/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...\n');

  console.log('--- Seeding Admin User ---');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(SEED_ADMIN_USER.plainPassword, salt);

  const admin = await prisma.user.upsert({
    where: { email: SEED_ADMIN_USER.email },
    update: {
      name: SEED_ADMIN_USER.name,
      username: SEED_ADMIN_USER.username,
      passwordHash: passwordHash,
      role: SEED_ADMIN_USER.role,
    },
    create: {
      name: SEED_ADMIN_USER.name,
      username: SEED_ADMIN_USER.username,
      email: SEED_ADMIN_USER.email,
      passwordHash: passwordHash,
      role: SEED_ADMIN_USER.role,
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email} (Username: ${admin.username})`);
  console.log(
    `⚠️  Credentials: Email: ${admin.email} | Password: ${SEED_ADMIN_USER.plainPassword}\n`,
  );


  // 2. Seed Categories
  console.log('--- Seeding Categories ---');
  const categoryMap = new Map<string, string>();
  for (const cat of SEED_CATEGORIES) {
    const createdCategory = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: cat.sortOrder,
      },
    });
    categoryMap.set(cat.slug, createdCategory.id);
    console.log(`✅ Category seeded: ${cat.name} (${cat.slug})`);
  }
  console.log('');

  // 3. Seed Sources
  console.log('--- Seeding Sources ---');
  const sourceMap = new Map<string, string>();
  for (const src of SEED_SOURCES) {
    const existingSource = await prisma.source.findFirst({
      where: { name: src.name },
    });

    let sourceId: string;
    if (existingSource) {
      sourceId = existingSource.id;
    } else {
      const createdSource = await prisma.source.create({
        data: {
          name: src.name,
          type: src.type,
          description: src.description,
        },
      });
      sourceId = createdSource.id;
    }
    sourceMap.set(src.name, sourceId);
    console.log(`✅ Source seeded: ${src.name} (${src.type})`);
  }
  console.log('');

  // 4. Seed Sample Duas, References, and Audios
  console.log('--- Seeding Sample Duas, References & Audios ---');
  for (const duaData of SEED_DUAS) {
    const categoryId = categoryMap.get(duaData.categorySlug);
    if (!categoryId) {
      console.warn(`⚠️ Category with slug '${duaData.categorySlug}' not found. Skipping.`);
      continue;
    }

    const existingDua = await prisma.dua.findFirst({
      where: { title: duaData.title },
    });

    let duaId: string;
    if (existingDua) {
      duaId = existingDua.id;
      console.log(`ℹ️ Dua already exists: "${duaData.title}"`);
    } else {
      const createdDua = await prisma.dua.create({
        data: {
          title: duaData.title,
          arabicText: duaData.arabicText,
          transliteration: duaData.transliteration,
          duaBangla: duaData.duaBangla,
          meaningBangla: duaData.meaningBangla,
          fadilah: duaData.fadilah,
          status: duaData.status,
          categoryId: categoryId,
          createdById: admin.id,
        },
      });
      duaId = createdDua.id;
      console.log(`✅ Dua created: "${duaData.title}"`);

      // Seed references
      for (const ref of duaData.references) {
        const sourceId = sourceMap.get(ref.sourceName);
        if (sourceId) {
          await prisma.duaReference.create({
            data: {
              duaId,
              sourceId,
              reference: ref.reference,
              note: ref.note,
              verified: ref.verified,
            },
          });
          console.log(`   🔗 Reference added: ${ref.sourceName} -> ${ref.reference}`);
        }
      }

      // Seed audios
      for (const audio of duaData.audios) {
        await prisma.duaAudio.create({
          data: {
            duaId,
            audioUrl: audio.audioUrl,
            reciterName: audio.reciterName,
            duration: audio.duration,
            language: audio.language,
            verified: audio.verified,
          },
        });
        console.log(`   🔊 Audio added: Reciter ${audio.reciterName}`);
      }

      // Seed Feed Post for this Dua
      const existingDuaPost = await prisma.post.findFirst({
        where: { duaId, type: 'DUA' },
      });
      if (!existingDuaPost) {
        await prisma.post.create({
          data: {
            authorId: admin.id,
            type: 'DUA',
            duaId,
            content: `রমজান এবং দৈনন্দিন জীবনে এই গুরুত্বপূর্ণ দোয়ার আমল করুন।`,
            visibility: 'PUBLIC',
            status: 'PUBLISHED',
          },
        });
        console.log(`   📝 Feed Post created for Dua: "${duaData.title}"`);
      }
    }
  }

  // 5. Seed Sample Text, Question, and Announcement Posts
  console.log('\n--- Seeding Sample Social Feed Posts ---');
  const samplePosts = [
    {
      type: 'ANNOUNCEMENT' as const,
      content: '🕊️ PeaceTweet-এ আপনাকে স্বাগতম! এটি একটি নিরিবিলি, অর্থপূর্ণ এবং বিশুদ্ধ ইসলামিক সোশ্যাল প্ল্যাটফর্ম। এখানে প্রাত্যহিক গুরুত্বপূর্ণ দোয়া, হাদিস ও জিকির চর্চা করুন।',
    },
    {
      type: 'QUESTION' as const,
      content: 'আজকের ফজর নামাজের পর আপনি কি সকালের মাসনুন দোয়া ও আয়াতুল কুরসি পাঠ করেছেন? আপনার দৈনন্দিন জিকিরের অভ্যাস কমেন্টে শেয়ার করুন।',
    },
    {
      type: 'TEXT' as const,
      content: 'রাসূলুল্লাহ ﷺ বলেছেন: "দোয়া হলো ইবাদতের মূল।" (তিরমিজি)। আপনার যেকোনো ছোট-বড় প্রয়োজনে সর্বদা আল্লাহর দরবারে হাত তুলুন।',
    },
    {
      type: 'TEXT' as const,
      content: '"যে ব্যক্তি দিনে ১০০ বার \'সুবহানাল্লাহি ওয়া বিহামদিহী\' পাঠ করে, তার সমুদ্রের ফেনা পরিমাণ পাপ থাকলেও ক্ষমা করে দেওয়া হয়।" — সহীহ বুখারী: ৬৪০৫',
    },
  ];

  for (const postData of samplePosts) {
    const existing = await prisma.post.findFirst({
      where: { content: postData.content },
    });
    if (!existing) {
      await prisma.post.create({
        data: {
          authorId: admin.id,
          type: postData.type,
          content: postData.content,
          visibility: 'PUBLIC',
          status: 'PUBLISHED',
        },
      });
      console.log(`✅ Seeded ${postData.type} Post`);
    }
  }

  console.log('\n🎉 Database Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
