export type RedeemCategory = 'BADGE' | 'COSMETIC' | 'PERK' | 'EXTERNAL_GIFT';

export type RedeemFulfillmentType =
  | 'INSTANT_BADGE'
  | 'INSTANT_COSMETIC'
  | 'INSTANT_PERK'
  | 'EXTERNAL_DELIVERY';

export type RedeemPreviewType =
  | 'BADGE_NEXT_TO_NAME'
  | 'AVATAR_FRAME'
  | 'PROFILE_THEME'
  | 'PERK_CARD'
  | 'GIFT_BOX';

export interface RedeemCatalogItem {
  code: string;
  category: RedeemCategory;
  fulfillmentType: RedeemFulfillmentType;
  previewType: RedeemPreviewType;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  badgeTagBn?: string;
  badgeTagEn?: string;
  accentColor: string;
  costPoints: number;
  isRepeatable: boolean;
  requiresEmailVerified: boolean;
  requiresDeliveryInfo: boolean;
  durationDays?: number | null;
  icon: string;
  isActive: boolean;
  comingSoon?: boolean;
  sortOrder: number;
}

export const REDEEM_CATALOG: RedeemCatalogItem[] = [
  {
    code: 'GREEN_VERIFIED_BADGE',
    category: 'BADGE',
    fulfillmentType: 'INSTANT_BADGE',
    previewType: 'BADGE_NEXT_TO_NAME',
    titleBn: 'গ্রীন ভেরিফাইড ব্যাজ',
    titleEn: 'Green Verified Badge',
    descriptionBn:
      'আপনার প্রোফাইল নাম, ফিড ও পোস্টের পাশে অফিসিয়াল গ্রীন ভেরিফাইড আইকন যুক্ত করুন। এটি রিডিম করতে জিমেইল ভেরিফাই করা বাধ্যতামূলক।',
    descriptionEn:
      'Unlock the official green verified icon next to your name on your profile and posts. Verified Gmail is mandatory.',
    badgeTagBn: 'অফিশিয়াল ব্যাজ',
    badgeTagEn: 'Official Badge',
    accentColor: '#22c55e',
    costPoints: 150,
    isRepeatable: false,
    requiresEmailVerified: true,
    requiresDeliveryInfo: false,
    icon: 'verified_user',
    isActive: true,
    comingSoon: false,
    sortOrder: 10,
  },
  {
    code: 'EMERALD_AVATAR_FRAME',
    category: 'COSMETIC',
    fulfillmentType: 'INSTANT_COSMETIC',
    previewType: 'AVATAR_FRAME',
    titleBn: 'এমেরাল্ড প্রোফাইল ফ্রেম',
    titleEn: 'Emerald Avatar Frame',
    descriptionBn:
      'আপনার প্রোফাইল ছবির চারপাশে দৃষ্টিনন্দন এমেরাল্ড রিং ও অ্যানিমেটেড বর্ডার সক্রিয় করুন। এটি রিডিম করতে জিমেইল ভেরিফাই করা বাধ্যতামূলক।',
    descriptionEn:
      'Equip an exclusive emerald animated ring decoration around your profile avatar across feed and comments. Verified Gmail is mandatory.',
    badgeTagBn: 'অ্যাভাটার ডেকোরেশন',
    badgeTagEn: 'Avatar Decoration',
    accentColor: '#10b981',
    costPoints: 120,
    isRepeatable: false,
    requiresEmailVerified: true,
    requiresDeliveryInfo: false,
    icon: 'auto_awesome',
    isActive: true,
    comingSoon: false,
    sortOrder: 20,
  },
  {
    code: 'NOOR_PROFILE_THEME',
    category: 'COSMETIC',
    fulfillmentType: 'INSTANT_COSMETIC',
    previewType: 'PROFILE_THEME',
    titleBn: 'নূর প্রোফাইল থিম',
    titleEn: 'Noor Profile Theme',
    descriptionBn:
      'আপনার প্রোফাইল কার্ডে প্রিমিয়াম গোল্ড-এমেরাল্ড গ্লো ও কাস্টম ব্যাকগ্রাউন্ড ইফেক্ট যুক্ত করুন।',
    descriptionEn:
      'Customize your profile header card with a serene gold-emerald accent effect.',
    badgeTagBn: 'প্রোফাইল ইফেক্ট',
    badgeTagEn: 'Profile Effect',
    accentColor: '#7c3aed',
    costPoints: 200,
    isRepeatable: false,
    requiresEmailVerified: false,
    requiresDeliveryInfo: false,
    icon: 'palette',
    isActive: true,
    comingSoon: false,
    sortOrder: 30,
  },
  {
    code: 'FEATURED_POST_PIN',
    category: 'PERK',
    fulfillmentType: 'INSTANT_PERK',
    previewType: 'PERK_CARD',
    titleBn: '৭ দিনের পিন ও বুস্ট পার্ক',
    titleEn: '7-Day Profile Pin & Boost',
    descriptionBn:
      'আপনার গুরুত্বপূর্ণ ইসলামিক পোস্ট বা দাওয়াহ কনটেন্ট ৭ দিনের জন্য প্রোফাইলের শীর্ষে পিন করে হাইলাইট করুন।',
    descriptionEn:
      'Pin and highlight a meaningful post at the top of your profile for 7 days.',
    badgeTagBn: '৭ দিনের সুবিধা',
    badgeTagEn: '7-Day Perk',
    accentColor: '#0866FF',
    costPoints: 250,
    isRepeatable: true,
    requiresEmailVerified: false,
    requiresDeliveryInfo: false,
    durationDays: 7,
    icon: 'bolt',
    isActive: true,
    comingSoon: true,
    sortOrder: 40,
  },
  {
    code: 'ISLAMIC_BOOK_GIFT',
    category: 'EXTERNAL_GIFT',
    fulfillmentType: 'EXTERNAL_DELIVERY',
    previewType: 'GIFT_BOX',
    titleBn: 'ইসলামিক বই উপহার (হোম ডেলিভারি)',
    titleEn: 'Islamic Book Gift (Delivered Outside App)',
    descriptionBn:
      'আপনার অর্জিত পয়েন্ট দিয়ে আসল ইসলামিক বই বা হাদিয়া গিফট বক্স আপনার ঠিকানায় কুরিয়ারের মাধ্যমে নিন।',
    descriptionEn:
      'Redeem earned points for a real-world Islamic book gift delivered straight to your address.',
    badgeTagBn: 'অ্যাপের বাইরের গিফট',
    badgeTagEn: 'Outside Gift',
    accentColor: '#d97706',
    costPoints: 750,
    isRepeatable: true,
    requiresEmailVerified: true,
    requiresDeliveryInfo: true,
    icon: 'card_giftcard',
    isActive: true,
    comingSoon: true,
    sortOrder: 50,
  },
  {
    code: 'DIGITAL_GIFT_VOUCHER',
    category: 'EXTERNAL_GIFT',
    fulfillmentType: 'EXTERNAL_DELIVERY',
    previewType: 'GIFT_BOX',
    titleBn: 'ডিজিটাল গিফট ভাউচার',
    titleEn: 'Digital Gift Voucher',
    descriptionBn:
      'পার্টনার বুকশপ বা চ্যারিটি হাদিয়া ভাউচার কোড হিসেবে ইমেইল ও অ্যাকাউন্টে গ্রহণ করুন।',
    descriptionEn:
      'Claim a real external partner voucher code delivered directly to your verified Gmail.',
    badgeTagBn: 'ভাউচার ও হাদিয়া',
    badgeTagEn: 'External Voucher',
    accentColor: '#ec4899',
    costPoints: 350,
    isRepeatable: true,
    requiresEmailVerified: true,
    requiresDeliveryInfo: true,
    icon: 'redeem',
    isActive: true,
    comingSoon: true,
    sortOrder: 60,
  },
];

export const REDEEM_BY_CODE = new Map(
  REDEEM_CATALOG.map((item) => [item.code, item]),
);
