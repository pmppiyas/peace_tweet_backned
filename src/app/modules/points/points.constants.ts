import { PointTaskCategory, PointTaskFrequency } from '@prisma/client';

export interface PointTaskSeedItem {
  code: string;
  category: PointTaskCategory;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  points: number;
  frequency: PointTaskFrequency;
  dailyLimit?: number | null;
  maxLimit?: number | null;
  targetCount?: number;
  actionRoute?: string | null;
  icon: string;
  sortOrder: number;
}

export interface PointLevelInfo {
  level: number;
  nameBn: string;
  nameEn: string;
  minPoints: number;
  badgeName: string;
  color: string;
}

export const POINT_LEVELS: PointLevelInfo[] = [
  {
    level: 1,
    nameBn: 'নবীন সদস্য',
    nameEn: 'Seeker',
    minPoints: 0,
    badgeName: 'SEEKER',
    color: '#64748b',
  },
  {
    level: 2,
    nameBn: 'সহযোগী',
    nameEn: 'Helper',
    minPoints: 100,
    badgeName: 'HELPER',
    color: '#0866FF',
  },
  {
    level: 3,
    nameBn: 'অবদানকারী',
    nameEn: 'Contributor',
    minPoints: 300,
    badgeName: 'CONTRIBUTOR',
    color: '#059669',
  },
  {
    level: 4,
    nameBn: 'কমিউনিটি দূত',
    nameEn: 'Ambassador',
    minPoints: 750,
    badgeName: 'AMBASSADOR',
    color: '#d97706',
  },
  {
    level: 5,
    nameBn: 'কমিউনিটি অভিভাবক',
    nameEn: 'Guardian',
    minPoints: 1500,
    badgeName: 'GUARDIAN',
    color: '#e11d48',
  },
];

export const DEFAULT_POINT_TASKS: PointTaskSeedItem[] = [
  // ─── 1. PROFILE TASKS ──────────────────────────────────────────────
  {
    code: 'UPLOAD_AVATAR',
    category: PointTaskCategory.PROFILE,
    titleBn: 'প্রোফাইল ছবি আপলোড করুন',
    titleEn: 'Upload Profile Photo',
    descriptionBn: 'আপনার প্রোফাইলে একটি পরিচ্ছন্ন প্রোফাইল ছবি যুক্ত করুন।',
    descriptionEn: 'Add a clear profile picture to personalize your account.',
    points: 20,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 1,
    actionRoute: '/profile',
    icon: 'account_circle',
    sortOrder: 10,
  },
  {
    code: 'UPLOAD_COVER',
    category: PointTaskCategory.PROFILE,
    titleBn: 'কভার ফটো আপলোড করুন',
    titleEn: 'Upload Cover Photo',
    descriptionBn: 'আপনার প্রোফাইল ব্যানারে একটি পছন্দের কভার ছবি যোগ করুন।',
    descriptionEn: 'Customize your profile banner with a cover photo.',
    points: 20,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 1,
    actionRoute: '/profile',
    icon: 'photo_camera',
    sortOrder: 20,
  },
  {
    code: 'ADD_BIO',
    category: PointTaskCategory.PROFILE,
    titleBn: 'প্রোফাইল বায়ো লিখুন',
    titleEn: 'Write Profile Bio',
    descriptionBn: 'আপনার সম্পর্কে সংক্ষেপে বায়ো বা পরিচিতি যুক্ত করুন।',
    descriptionEn: 'Tell the community a little about yourself in your bio.',
    points: 10,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 1,
    actionRoute: '/settings/profile',
    icon: 'edit_note',
    sortOrder: 30,
  },
  {
    code: 'SET_LOCATION',
    category: PointTaskCategory.PROFILE,
    titleBn: 'ঠিকানা ও অবস্থান সেট করুন',
    titleEn: 'Set Your Location',
    descriptionBn: 'আপনার দেশ, জেলা বা শহর প্রোফাইলে যুক্ত করুন।',
    descriptionEn: 'Add your country, city, or area to connect locally.',
    points: 10,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 1,
    actionRoute: '/settings/profile',
    icon: 'location_on',
    sortOrder: 40,
  },
  {
    code: 'VERIFY_EMAIL',
    category: PointTaskCategory.PROFILE,
    titleBn: 'জিমেইল / ইমেইল ভেরিফাই করুন',
    titleEn: 'Verify Gmail / Email',
    descriptionBn: 'প্রোফাইল থেকে আপনার ইমেইল ভেরিফাই করে ৫০ পয়েন্ট পান। গ্রীন ভেরিফাইড আইকন পাওয়ার জন্য এটি বাধ্যতামূলক।',
    descriptionEn: 'Verify your Gmail or email in Profile for +50 pts. Mandatory to unlock the green verified icon.',
    points: 50,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 1,
    actionRoute: '/settings/profile',
    icon: 'mail',
    sortOrder: 45,
  },
  {
    code: 'COMPLETE_PROFILE_100',
    category: PointTaskCategory.PROFILE,
    titleBn: '১০০% প্রোফাইল সম্পূর্ণ করুন',
    titleEn: '100% Profile Completion Bonus',
    descriptionBn: 'প্রোফাইল ছবি, কভার ফটো, বায়ো ও ঠিকানা পূরণ করে বোনাস পান (জিমেইল ভেরিফাইসহ গ্রীন ভেরিফাইড আইকন আনলক হবে)।',
    descriptionEn: 'Complete profile photo, cover, bio, and location for a bonus (pair with Gmail verification for the green verified icon).',
    points: 35,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 1,
    actionRoute: '/settings/profile',
    icon: 'verified_user',
    sortOrder: 60,
  },

  // ─── 2. DAILY CHECK-IN & STREAKS ───────────────────────────────────
  {
    code: 'DAILY_CHECKIN',
    category: PointTaskCategory.DAILY,
    titleBn: 'দৈনিক চেক-ইন',
    titleEn: 'Daily Check-In',
    descriptionBn: 'প্রতিদিন অ্যাপে এসে চেক-ইন করে পয়েন্ট সংগ্রহ করুন।',
    descriptionEn: 'Check in once every day to earn daily bonus points.',
    points: 5,
    frequency: PointTaskFrequency.DAILY,
    dailyLimit: 1,
    targetCount: 1,
    actionRoute: '/points',
    icon: 'today',
    sortOrder: 70,
  },
  {
    code: 'WEEKLY_STREAK_7',
    category: PointTaskCategory.DAILY,
    titleBn: '৭ দিনের টানা স্ট্রিক বোনাস',
    titleEn: '7-Day Streak Bonus',
    descriptionBn: 'টানা ৭ দিন চেক-ইন করলে অতিরিক্ত বোনাস পয়েন্ট পাবেন।',
    descriptionEn: 'Keep checking in for 7 consecutive days for a streak bonus.',
    points: 30,
    frequency: PointTaskFrequency.CAPPED,
    maxLimit: 52,
    targetCount: 7,
    actionRoute: '/points',
    icon: 'local_fire_department',
    sortOrder: 80,
  },

  // ─── 3. REFERRAL / INVITE FRIENDS ──────────────────────────────────
  {
    code: 'INVITE_FRIEND_JOIN',
    category: PointTaskCategory.REFERRAL,
    titleBn: 'বন্ধুকে ইনভাইট করুন (জয়েন)',
    titleEn: 'Invite a Friend (Sign Up)',
    descriptionBn: 'আপনার রেফারেল লিংক দিয়ে বন্ধু জয়েন করলেই পয়েন্ট পাবেন।',
    descriptionEn: 'Earn points whenever a friend joins using your invite link.',
    points: 30,
    frequency: PointTaskFrequency.CAPPED,
    maxLimit: 50,
    targetCount: 1,
    actionRoute: '/points',
    icon: 'person_add',
    sortOrder: 90,
  },
  {
    code: 'INVITE_FRIEND_QUALIFIED',
    category: PointTaskCategory.REFERRAL,
    titleBn: 'ইনভাইট বন্ধুর অ্যাক্টিভ বোনাস',
    titleEn: 'Active Referral Bonus',
    descriptionBn: 'আমন্ত্রিত বন্ধু প্রথম পোস্ট বা প্রোফাইল সম্পূর্ণ করলে বোনাস পান।',
    descriptionEn: 'Extra bonus when your invited friend sets up their profile or posts.',
    points: 50,
    frequency: PointTaskFrequency.CAPPED,
    maxLimit: 50,
    targetCount: 1,
    actionRoute: '/points',
    icon: 'card_giftcard',
    sortOrder: 100,
  },
  {
    code: 'WELCOME_REFERRAL_BONUS',
    category: PointTaskCategory.REFERRAL,
    titleBn: 'ইনভাইট ওয়েলকাম বোনাস',
    titleEn: 'Invite Welcome Bonus',
    descriptionBn: 'বন্ধুর ইউজারনেম বা ইনভাইট লিংক ব্যবহার করে অ্যাকাউন্ট খোলার বোনাস।',
    descriptionEn: 'Welcome bonus received for joining via a friend invite.',
    points: 20,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 1,
    actionRoute: '/points',
    icon: 'celebration',
    sortOrder: 105,
  },

  // ─── 4. SOCIAL & FEED ACTIONS ──────────────────────────────────────
  {
    code: 'CREATE_POST',
    category: PointTaskCategory.SOCIAL,
    titleBn: 'নতুন পোস্ট তৈরি করুন',
    titleEn: 'Create a Post',
    descriptionBn: 'ভালো কথা, দোয়া বা উপকারী অভিজ্ঞতা পোস্ট করুন (দৈনিক সর্বোচ্চ ৩টি)।',
    descriptionEn: 'Publish a reflection, Dua, or beneficial thought (up to 3/day).',
    points: 10,
    frequency: PointTaskFrequency.DAILY,
    dailyLimit: 3,
    targetCount: 3,
    actionRoute: '/',
    icon: 'post_add',
    sortOrder: 110,
  },
  {
    code: 'COMMENT_POST',
    category: PointTaskCategory.SOCIAL,
    titleBn: 'পোস্টে অর্থবহ কমেন্ট করুন',
    titleEn: 'Comment on a Post',
    descriptionBn: 'অন্যের পোস্টে সুন্দর মন্তব্য করুন (দৈনিক সর্বোচ্চ ৫টি)।',
    descriptionEn: 'Leave helpful comments on others’ posts (up to 5/day).',
    points: 3,
    frequency: PointTaskFrequency.DAILY,
    dailyLimit: 5,
    targetCount: 5,
    actionRoute: '/',
    icon: 'chat_bubble',
    sortOrder: 120,
  },
  {
    code: 'REACT_POST',
    category: PointTaskCategory.SOCIAL,
    titleBn: 'পোস্টে লাইক / রিঅ্যাক্ট দিন',
    titleEn: 'React to Posts',
    descriptionBn: 'ভালো পোস্টগুলোতে রিঅ্যাক্ট দিয়ে উৎসাহিত করুন (দৈনিক ১০টি)।',
    descriptionEn: 'Like or react to community posts (up to 10/day).',
    points: 1,
    frequency: PointTaskFrequency.DAILY,
    dailyLimit: 10,
    targetCount: 10,
    actionRoute: '/',
    icon: 'favorite',
    sortOrder: 130,
  },
  {
    code: 'SHARE_CONTENT',
    category: PointTaskCategory.SOCIAL,
    titleBn: 'দোয়া বা পোস্ট শেয়ার করুন',
    titleEn: 'Share a Post or Dua',
    descriptionBn: 'উপকারী পোস্ট বা দোয়া অন্যদের সাথে শেয়ার করুন (দৈনিক ৩টি)।',
    descriptionEn: 'Share beneficial posts, Duas, or blood alerts (up to 3/day).',
    points: 5,
    frequency: PointTaskFrequency.DAILY,
    dailyLimit: 3,
    targetCount: 3,
    actionRoute: '/',
    icon: 'share',
    sortOrder: 140,
  },
  {
    code: 'SAVE_BOOKMARK',
    category: PointTaskCategory.SOCIAL,
    titleBn: 'দোয়া বা পোস্ট সেভ করুন',
    titleEn: 'Save to Daily Routine',
    descriptionBn: 'দৈনিক আমলের জন্য পোস্ট বা দোয়া সেভ করুন (দৈনিক ৩টি)।',
    descriptionEn: 'Bookmark a Dua or post to your daily routine (up to 3/day).',
    points: 5,
    frequency: PointTaskFrequency.DAILY,
    dailyLimit: 3,
    targetCount: 3,
    actionRoute: '/saved',
    icon: 'bookmark',
    sortOrder: 150,
  },

  // ─── 5. COMMUNITY, FRIENDS, GROUPS & BLOOD ─────────────────────────
  {
    code: 'MAKE_FRIEND',
    category: PointTaskCategory.COMMUNITY,
    titleBn: 'নতুন বন্ধু তৈরি করুন',
    titleEn: 'Make a New Friend',
    descriptionBn: 'ফ্রেন্ড রিকোয়েস্ট গ্রহণ করলে বা গৃহীত হলে পয়েন্ট পান (দৈনিক ৫ জন)।',
    descriptionEn: 'Connect with a new friend when a friend request is accepted (up to 5/day).',
    points: 15,
    frequency: PointTaskFrequency.DAILY,
    dailyLimit: 5,
    targetCount: 5,
    actionRoute: '/friends',
    icon: 'group',
    sortOrder: 160,
  },
  {
    code: 'MILESTONE_5_FRIENDS',
    category: PointTaskCategory.COMMUNITY,
    titleBn: '৫ জন বন্ধুর মাইলফলক',
    titleEn: '5 Friends Milestone',
    descriptionBn: 'মোট ৫ জন বন্ধুর সাথে যুক্ত হয়ে অতিরিক্ত বোনাস পান।',
    descriptionEn: 'Reach 5 connected friends to unlock this milestone bonus.',
    points: 30,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 5,
    actionRoute: '/friends',
    icon: 'groups',
    sortOrder: 170,
  },
  {
    code: 'MILESTONE_25_FRIENDS',
    category: PointTaskCategory.COMMUNITY,
    titleBn: '২৫ জন বন্ধুর মাইলফলক',
    titleEn: '25 Friends Milestone',
    descriptionBn: 'মোট ২৫ জন বন্ধুর সাথে যুক্ত হয়ে বড় বোনাস পান।',
    descriptionEn: 'Reach 25 connected friends to unlock a major milestone bonus.',
    points: 75,
    frequency: PointTaskFrequency.ONE_TIME,
    targetCount: 25,
    actionRoute: '/friends',
    icon: 'diversity_3',
    sortOrder: 180,
  },
  {
    code: 'JOIN_GROUP',
    category: PointTaskCategory.COMMUNITY,
    titleBn: 'কমিউনিটি গ্রুপে যোগ দিন',
    titleEn: 'Join a Group',
    descriptionBn: 'পছন্দের ইসলামিক বা সামাজিক গ্রুপে যুক্ত হোন (সর্বোচ্চ ৫টি)।',
    descriptionEn: 'Join a community group (up to 5 groups).',
    points: 10,
    frequency: PointTaskFrequency.CAPPED,
    maxLimit: 5,
    targetCount: 5,
    actionRoute: '/groups',
    icon: 'group_add',
    sortOrder: 190,
  },
  {
    code: 'CREATE_GROUP',
    category: PointTaskCategory.COMMUNITY,
    titleBn: 'নতুন গ্রুপ তৈরি করুন',
    titleEn: 'Create a Group',
    descriptionBn: 'নিজের এলাকা বা বিষয়ের ওপর নতুন গ্রুপ খুলুন (সর্বোচ্চ ৩টি)।',
    descriptionEn: 'Start a community group for a good cause (up to 3 groups).',
    points: 25,
    frequency: PointTaskFrequency.CAPPED,
    maxLimit: 3,
    targetCount: 3,
    actionRoute: '/groups',
    icon: 'add_circle',
    sortOrder: 200,
  },
];

export const getDhakaDateKey = (date = new Date()): string => {
  // Format YYYY-MM-DD in Asia/Dhaka (+06:00) consistently
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const dhaka = new Date(utcMs + 6 * 3600000);
  const y = dhaka.getFullYear();
  const m = String(dhaka.getMonth() + 1).padStart(2, '0');
  const d = String(dhaka.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getYesterdayDhakaDateKey = (date = new Date()): string => {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const dhakaYesterday = new Date(utcMs + 6 * 3600000 - 24 * 3600000);
  const y = dhakaYesterday.getFullYear();
  const m = String(dhakaYesterday.getMonth() + 1).padStart(2, '0');
  const d = String(dhakaYesterday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const resolveLevelInfo = (lifetimePoints: number) => {
  let current = POINT_LEVELS[0];
  for (const lvl of POINT_LEVELS) {
    if (lifetimePoints >= lvl.minPoints) {
      current = lvl;
    }
  }
  const currentIdx = POINT_LEVELS.findIndex((l) => l.level === current.level);
  const next = POINT_LEVELS[currentIdx + 1] || null;
  const range = next ? Math.max(1, next.minPoints - current.minPoints) : 1;
  const progressRatio = next
    ? Math.min(1, Math.max(0, (lifetimePoints - current.minPoints) / range))
    : 1;

  return {
    current,
    next,
    pointsToNext: next ? Math.max(0, next.minPoints - lifetimePoints) : 0,
    progressPercent: Math.round(progressRatio * 100),
  };
};
