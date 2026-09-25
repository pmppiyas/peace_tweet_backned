import { envConfig } from '../config/env.config';
import { Role } from '../common/enums/role.enum';
import { SourceType } from '../common/enums/source-type.enum';
import { DuaStatus } from '../common/enums/dua-status.enum';

export const SEED_ADMIN_USER = {
  get name() {
    return envConfig().admin.name;
  },
  get username() {
    return envConfig().admin.username;
  },
  get email() {
    return envConfig().admin.email;
  },
  get plainPassword() {
    return envConfig().admin.password;
  },
  role: Role.ADMIN,
};

export const SEED_CATEGORIES = [
  {
    name: 'Morning & Evening',
    slug: 'morning-evening',
    description: 'Essential daily morning and evening supplications & dhikr',
    sortOrder: 1,
  },
  {
    name: 'Prayer & Dhikr',
    slug: 'prayer',
    description: 'Supplications related to Salah and post-prayer remembrances',
    sortOrder: 2,
  },
  {
    name: 'Sleep & Awakening',
    slug: 'sleep',
    description: 'Duas for going to sleep and waking up in the morning',
    sortOrder: 3,
  },
  {
    name: 'Food & Dining',
    slug: 'food',
    description: 'Etiquette and supplications before and after meals',
    sortOrder: 4,
  },
  {
    name: 'Travel & Journey',
    slug: 'travel',
    description: 'Supplications for boarding transport, travel, and arriving safely',
    sortOrder: 5,
  },
  {
    name: 'Sustenance & Blessings',
    slug: 'sustenance',
    description: 'Duas for halal rizq, abundance, and barakah in life',
    sortOrder: 6,
  },
  {
    name: 'Forgiveness & Repentance',
    slug: 'forgiveness',
    description: 'Supplications for seeking forgiveness, repentance, and purification',
    sortOrder: 7,
  },
  {
    name: 'Distress & Relief',
    slug: 'distress',
    description: 'Duas for anxiety, hardship, sadness, illness, and debt relief',
    sortOrder: 8,
  },
  {
    name: 'General Duas',
    slug: 'others',
    description: 'Important daily life prayers and prophetic supplications',
    sortOrder: 9,
  },
];

export const SEED_SOURCES = [
  {
    name: "The Holy Qur'an",
    type: SourceType.QURAN,
    description: 'The Noble Word of Allah',
  },
  {
    name: 'Sahih al-Bukhari',
    type: SourceType.HADITH,
    description: 'Imam al-Bukhari',
  },
  {
    name: 'Sahih Muslim',
    type: SourceType.HADITH,
    description: 'Imam Muslim',
  },
  {
    name: 'Sunan Abi Dawud',
    type: SourceType.HADITH,
    description: 'Imam Abu Dawud',
  },
  {
    name: 'Jami` at-Tirmidhi',
    type: SourceType.HADITH,
    description: 'Imam at-Tirmidhi',
  },
  {
    name: "Sunan an-Nasa'i",
    type: SourceType.HADITH,
    description: "Imam an-Nasa'i",
  },
  {
    name: 'Sunan Ibn Majah',
    type: SourceType.HADITH,
    description: 'Imam Ibn Majah',
  },
];

export const SEED_DUAS = [
  {
    categorySlug: 'morning-evening',
    title: 'Sayyid al-Istighfar (The Master of Forgiveness)',
    arabicText:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration:
      "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa-ana 'abduka, wa-ana 'ala 'ahdika wa-wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa-abu'u laka bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa anta",
    duaBangla:
      'O Allah! You are my Lord, there is no deity worthy of worship except You. You created me and I am Your servant, and I am abiding by Your covenant and promise as much as I am able. I seek refuge in You from the evil of what I have done. I acknowledge Your blessings upon me, and I confess my sins, so forgive me, for none can forgive sins except You.',
    meaningBangla:
      'O Allah! You are my Lord, there is no deity worthy of worship except You. You created me and I am Your servant, and I am abiding by Your covenant and promise as much as I am able. I seek refuge in You from the evil of what I have done. I acknowledge Your blessings upon me, and I confess my sins, so forgive me, for none can forgive sins except You.',
    fadilah:
      'The Prophet Muhammad ﷺ said: "Whoever recites this supplication with sincere faith during the day (in the morning) and dies before evening, will be among the people of Paradise. And whoever recites it during the night with sincere faith and dies before morning, will be among the people of Paradise." It is considered the chief of all prayers for forgiveness.',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: 'Hadith 6306',
        note: 'Book of Invocations (The Most Superior Way of Asking Forgiveness)',
        verified: true,
      },
      {
        sourceName: "Sunan an-Nasa'i",
        reference: 'Hadith 5522',
        note: "Sunan an-Nasa'i",
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/sayyidul-istighfar.mp3',
        reciterName: 'Sheikh Mishary Rashid Alafasy',
        duration: 35,
        language: 'ar',
        verified: true,
      },
    ],
  },
  {
    categorySlug: 'sleep',
    title: 'Supplication Before Going to Sleep',
    arabicText: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amootu wa-ahya',
    duaBangla: 'In Your name, O Allah, I die (sleep) and I live (awaken).',
    meaningBangla: 'In Your name, O Allah, I die (sleep) and I live (awaken).',
    fadilah:
      'Narrated by Hudhayfah (RA): When the Prophet ﷺ went to bed at night, he would place his right hand under his cheek and recite this supplication, placing his complete trust and life in the hands of Allah throughout the night.',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: 'Hadith 6324',
        note: 'Book of Invocations',
        verified: true,
      },
      {
        sourceName: 'Sahih Muslim',
        reference: 'Hadith 2711',
        note: 'Book of Remembrance and Supplication',
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/sleep-bukhari-6324.mp3',
        reciterName: 'Sheikh Saad Al Ghamdi',
        duration: 8,
        language: 'ar',
        verified: true,
      },
    ],
  },
  {
    categorySlug: 'distress',
    title: 'Supplication for Relief from Worry, Grief, and Debt',
    arabicText:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ',
    transliteration:
      "Allahumma inni a'udhu bika minal-hammi wal-hazani, wal-'ajzi wal-kasali, wal-bukhli wal-jubni, wa-dala'id-dayni, wa-ghalabatir-rijal",
    duaBangla:
      'O Allah! I seek refuge in You from worry and grief, from incapacity and laziness, from cowardice and miserliness, from the burden of debt, and from being overpowered by men.',
    meaningBangla:
      'O Allah! I seek refuge in You from worry and grief, from incapacity and laziness, from cowardice and miserliness, from the burden of debt, and from being overpowered by men.',
    fadilah:
      'Anas ibn Malik (RA) narrated: I used to serve the Messenger of Allah ﷺ and heard him repeat this powerful prayer constantly to seek protection from mental anxiety, physical weakness, financial strain, and oppression.',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: 'Hadith 2893',
        note: 'Book of Invocations and Jihad',
        verified: true,
      },
      {
        sourceName: 'Sunan Abi Dawud',
        reference: 'Hadith 1551',
        note: 'Sunan Abi Dawud',
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/hamm-hazan.mp3',
        reciterName: 'Sheikh Nasser Al Qatami',
        duration: 18,
        language: 'ar',
        verified: true,
      },
    ],
  },
  {
    categorySlug: 'sleep',
    title: 'Supplication Upon Waking Up in the Morning',
    arabicText: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: "Alhamdu lillahilladhi ahyana ba'da ma amatana wa-ilayhin nushoor",
    duaBangla:
      'All praise is due to Allah, Who gave us life after having given us death (sleep), and unto Him is the resurrection.',
    meaningBangla:
      'All praise is due to Allah, Who gave us life after having given us death (sleep), and unto Him is the resurrection.',
    fadilah:
      'Reciting this supplication immediately upon waking awakens the heart with sincere gratitude to the Creator, repels morning lethargy, and invites peace and divine blessing into every task of the day.',
    status: DuaStatus.PUBLISHED,
    references: [
      {
        sourceName: 'Sahih al-Bukhari',
        reference: 'Hadith 6312',
        note: 'Book of Invocations',
        verified: true,
      },
    ],
    audios: [
      {
        audioUrl: 'https://audio.example.com/duas/wake-up.mp3',
        reciterName: 'Sheikh Abu Bakr Al Shatri',
        duration: 10,
        language: 'ar',
        verified: true,
      },
    ],
  },
];
