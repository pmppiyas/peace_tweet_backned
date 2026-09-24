import { Role } from '../common/enums/role.enum';
import { SourceType } from '../common/enums/source-type.enum';
import { DuaStatus } from '../common/enums/dua-status.enum';

export const SEED_ADMIN_USER = {
  name: 'System Admin',
  username: 'admin',
  email: 'admin@example.com',
  // Password for development: Admin123!
  passwordHash: '$2b$10$wT33y2xY/dhyz9IqK3Uj/OiYk048o5sYIuXqgVn4fI0N3Wc3nN6yq', // Pre-hashed 'Admin123!'
  plainPassword: 'Admin123!',
  role: Role.ADMIN,
};

export const SEED_CATEGORIES = [
  {
    name: 'সকাল-সন্ধ্যা',
    slug: 'morning-evening',
    description: 'সকাল ও সন্ধ্যার দৈনন্দিন মাসনুন দোয়া ও যিকিরসমূহ',
    sortOrder: 1,
  },
  {
    name: 'নামাজ',
    slug: 'prayer',
    description: 'সালাত ও সালাত পরবর্তী দোয়া ও তাসবীহসমূহ',
    sortOrder: 2,
  },
  {
    name: 'ঘুম',
    slug: 'sleep',
    description: 'ঘুমানোর সময় ও ঘুম থেকে জাগ্রত হওয়ার দোয়া',
    sortOrder: 3,
  },
  {
    name: 'খাবার',
    slug: 'food',
    description: 'খাবার খাওয়ার শুরু ও শেষের দোয়া',
    sortOrder: 4,
  },
  {
    name: 'সফর',
    slug: 'travel',
    description: 'ভ্রমণ ও যানবাহনে উঠার দোয়া',
    sortOrder: 5,
  },
  {
    name: 'রিজিক',
    slug: 'sustenance',
    description: 'হালাল জীবিকা ও বরকতের দোয়া',
    sortOrder: 6,
  },
  {
    name: 'ক্ষমা',
    slug: 'forgiveness',
    description: 'ইস্তিগফার ও তওবার দোয়া',
    sortOrder: 7,
  },
  {
    name: 'বিপদ',
    slug: 'distress',
    description: 'দুশ্চিন্তা, রোগমুক্তি ও বিপদাপদের দোয়া',
    sortOrder: 8,
  },
  {
    name: 'অন্যান্য',
    slug: 'others',
    description: 'অন্যান্য গুরুত্বপূর্ণ জীবনের দোয়া ও মুনাজাত',
    sortOrder: 9,
  },
];

export const SEED_SOURCES = [
  {
    name: "Qur'an",
    type: SourceType.QURAN,
    description: 'পবিত্র আল-কোরআন কারীম',
  },
  {
    name: 'Sahih al-Bukhari',
    type: SourceType.HADITH,
    description: 'সহীহুল বুখারী - ইমাম বুখারী (রহ.)',
  },
  {
    name: 'Sahih Muslim',
    type: SourceType.HADITH,
    description: 'সহীহ মুসলিম - ইমাম মুসলিম (রহ.)',
  },
  {
    name: 'Sunan Abi Dawud',
    type: SourceType.HADITH,
    description: 'সুনানে আবু দাউদ - ইমাম আবু দাউদ (রহ.)',
  },
  {
    name: "Jami` at-Tirmidhi",
    type: SourceType.HADITH,
    description: 'জামে আত-তিরমিযী - ইমাম তিরমিযী (রহ.)',
  },
  {
    name: "Sunan an-Nasa'i",
    type: SourceType.HADITH,
    description: 'সুনানে আন-নাসায়ী - ইমাম নাসায়ী (রহ.)',
  },
  {
    name: 'Sunan Ibn Majah',
    type: SourceType.HADITH,
    description: 'সুনানে ইবনে মাজাহ - ইমাম ইবনে মাজাহ (রহ.)',
  },
];

export const SEED_DUAS = [
  {
    categorySlug: 'sleep',
    title: 'ঘুমানোর সময় পড়ার দোয়া',
    arabicText: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: "Bismika Allahumma amootu wa-ahya",
    duaBangla: 'হে আল্লাহ! আপনারই নামে আমি মৃত্যুবরণ (ঘুমাই) করছি এবং আপনারই অনুগ্রহে আবার জীবিত (জাগ্রত) হব।',
    meaningBangla: 'হে আল্লাহ! আপনার নাম নিয়ে আমি মৃত্যুবরণ (নিদ্রা) করি এবং জীবিত (জাগ্রত) হই।',
    fadilah: 'রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম রাতে বিছানায় যাওয়ার সময় ডান হাত গালের নিচে রেখে এই দোয়া পড়তেন।',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: '6324',
        note: 'সহীহ বুখারী, কিতাবুত দাওয়াত',
        verified: true,
      },
      {
        sourceName: 'Sahih Muslim',
        reference: '2711',
        note: 'সহীহ মুসলিম, যিকির ও দোয়া অধ্যায়',
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/sleep-bukhari-6324.mp3',
        reciterName: 'Mishary Rashid Alafasy',
        duration: 8,
        language: 'ar',
        verified: true,
      },
    ],
  },
  {
    categorySlug: 'sleep',
    title: 'ঘুম থেকে জাগ্রত হওয়ার দোয়া',
    arabicText: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: "Alhamdu lillahilladhi ahyana ba'da ma amatana wa-ilayhin nushoor",
    duaBangla: 'সকল প্রশংসা আল্লাহর জন্য, যিনি আমাদের মৃত্যু (ঘুম) দেওয়ার পর পুনরায় জীবন দান করলেন এবং তাঁরই কাছে সকলের পুনরুত্থান হবে।',
    meaningBangla: 'সকল প্রশংসা আল্লাহর জন্য, যিনি আমাদের মৃত্যুর পর জীবিত করলেন এবং তাঁর দিকেই প্রত্যাবর্তন।',
    fadilah: 'ঘুম থেকে ওঠার সাথে সাথে এই দোয়া পড়লে অন্তরে আল্লাহর শোকরানা বৃদ্ধি পায় ও দিনটি বরকতময় হয়।',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: '6312',
        note: 'সহীহ বুখারী',
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/wake-up.mp3',
        reciterName: 'Saad Al Ghamdi',
        duration: 10,
        language: 'ar',
        verified: true,
      },
    ],
  },
  {
    categorySlug: 'morning-evening',
    title: 'সকাল ও সন্ধ্যার সাইয়্যিদুল ইস্তিগফার (শ্রেষ্ঠ ক্ষমাপ্রার্থনা)',
    arabicText: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration: "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa-ana 'abduka, wa-ana 'ala 'ahdika wa-wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa-abu'u laka bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa anta",
    duaBangla: 'হে আল্লাহ! আপনি আমার রব, আপনি ছাড়া কোনো উপাস্য নেই। আপনি আমাকে সৃষ্টি করেছেন এবং আমি আপনার বান্দা...',
    meaningBangla: 'যে ব্যক্তি দৃঢ় বিশ্বাসের সাথে দিনে এটি পাঠ করবে এবং সন্ধ্যার আগেই মারা যাবে, সে জান্নাতীদের অন্তর্ভুক্ত হবে।',
    fadilah: 'ইমাম বুখারী (রহ.) কর্তৃক বর্ণিত, এটি সমস্ত ইস্তিগফারের সরদার বা শ্রেষ্ঠ ইস্তিগফার।',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: '6306',
        note: 'সহীহ বুখারী, বাবু আফদালিল ইস্তিগফার',
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/sayyidul-istighfar.mp3',
        reciterName: 'Mishary Rashid Alafasy',
        duration: 35,
        language: 'ar',
        verified: true,
      },
    ],
  },
  {
    categorySlug: 'distress',
    title: 'দুশ্চিন্তা ও ঋণ মুক্তির দোয়া',
    arabicText: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ',
    transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazani, wal-'ajzi wal-kasali, wal-bukhli wal-jubni, wa-dala'id-dayni, wa-ghalabatir-rijal",
    duaBangla: 'হে আল্লাহ! নিশ্চয়ই আমি আপনার আশ্রয় চাই দুশ্চিন্তা ও দুঃখ-বেদনা থেকে, অক্ষমতা ও অলসতা থেকে, কৃপণতা ও কাপুরুষতা থেকে, ঋণের বোঝা ও মানুষের পরাভব থেকে।',
    meaningBangla: 'সকল প্রকার মানসিক অবসাদ, আর্থিক কষ্ট ও দুর্বলতা থেকে মুক্তির প্রার্থনামূলক নবীজী (সা.)-এর অন্যতম প্রিয় দোয়া।',
    fadilah: 'হযরত আনাস (রা.) বলেন, রাসূলুল্লাহ (সা.) এই দোয়াটি অধিক পরিমাণে পাঠ করতেন।',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: '2893',
        note: 'সহীহ বুখারী',
        verified: true,
      },
      {
        sourceName: 'Sunan Abi Dawud',
        reference: '1551',
        note: 'সুনানে আবু দাউদ',
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/hamm-hazan.mp3',
        reciterName: 'Nasser Al Qatami',
        duration: 18,
        language: 'ar',
        verified: true,
      },
    ],
  },
];
