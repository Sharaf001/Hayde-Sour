import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'ar' | 'fr';

type LanguageOption = {
  code: Language;
  label: string;
};

const LANGUAGE_KEY = 'wtgs-language';

export const languageOptions: LanguageOption[] = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'FR' },
];

const translations = {
  en: {
    discover: 'Discover', nature: 'Nature', saved: 'Saved', account: 'Account center', login: 'Log in',
    heroLocation: 'Tyre, South Lebanon', heroLineOne: 'This is where', heroLineTwo: 'the good days', heroLineThree: 'begin.',
    heroText: 'A warm, useful guide to Sour - Start here.', heroSearch: 'Try "sea view", "coffee"...', search: 'Search',
    localShortcut: 'The local shortcut', localShortcutText: 'Ways to find your feet in the city.',
    featuredLabel: 'A few places we love', featuredTitle: 'The local edit, not the loudest list.',
    featuredText: 'Some places make you feel like you have been coming here for years.', seeAll: 'See all spots',
    categoriesLabel: 'Start with what you need', categoriesTitle: 'A city with a little bit of everything.', allCategories: 'All categories',
    loadingCategories: 'Loading categories...', noCategories: 'No categories are available yet.',
    dayLabel: 'Borrow our', dayTitle: 'One good day in Sour.', dayText: 'No rushing. Just enough of the old city, the sea and something good to eat.', saveDay: 'Save this day',
    goodToKnow: 'Good to know', localContext: 'A little local context.', localContextText: 'The details that make a day out feel easy.',
    getAround: 'Get around', stayConnected: 'Stay connected', needHelp: 'Need a hand?', bestAddress: 'The best address',
    backToTop: 'Back to top', explorePlaces: 'Explore places', supportedBy: 'Supported by',
  },
  ar: {
    discover: 'اكتشف', nature: 'الطبيعة', saved: 'المحفوظات', account: 'الحساب', login: 'تسجيل الدخول',
    heroLocation: 'صور، جنوب لبنان', heroLineOne: 'هنا تبدأ', heroLineTwo: 'الأيام الجميلة', heroLineThree: '.',
    heroText: 'دليل دافئ وعملي لصور - ابدأ من هنا.', heroSearch: 'جرّب "إطلالة بحرية" أو "قهوة"...', search: 'بحث',
    localShortcut: 'الدليل المحلي', localShortcutText: 'طرق سهلة لاكتشاف المدينة.',
    featuredLabel: 'أماكن نحبها', featuredTitle: 'اختيارات محلية، لا قائمة صاخبة.',
    featuredText: 'أماكن تجعلك تشعر أنك تعرفها منذ سنوات.', seeAll: 'شاهد كل الأماكن',
    categoriesLabel: 'ابدأ بما تحتاجه', categoriesTitle: 'مدينة فيها القليل من كل شيء.', allCategories: 'كل الفئات',
    loadingCategories: 'جار تحميل الفئات...', noCategories: 'لا توجد فئات متاحة بعد.',
    dayLabel: 'استعر يوم', dayTitle: 'يوم جميل في صور.', dayText: 'بلا استعجال. القليل من المدينة القديمة والبحر وطعام لذيذ.', saveDay: 'احفظ هذا اليوم',
    goodToKnow: 'من الجيد أن تعرف', localContext: 'سياق محلي بسيط.', localContextText: 'تفاصيل تجعل يومك أسهل.',
    getAround: 'التنقل', stayConnected: 'ابق متصلاً', needHelp: 'تحتاج مساعدة؟', bestAddress: 'أفضل عنوان',
    backToTop: 'العودة للأعلى', explorePlaces: 'استكشف الأماكن', supportedBy: 'بدعم من',
  },
  fr: {
    discover: 'Découvrir', nature: 'Nature', saved: 'Enregistrés', account: 'Mon compte', login: 'Connexion',
    heroLocation: 'Tyr, Sud-Liban', heroLineOne: 'Ici commencent', heroLineTwo: 'les beaux jours', heroLineThree: '.',
    heroText: 'Un guide chaleureux et pratique de Sour - Commencez ici.', heroSearch: 'Essayez « vue mer », « café »...', search: 'Rechercher',
    localShortcut: 'Le raccourci local', localShortcutText: 'Des repères pour trouver vos marques en ville.',
    featuredLabel: 'Quelques adresses que nous aimons', featuredTitle: 'Le choix local, pas la liste la plus bruyante.',
    featuredText: 'Des lieux qui donnent l’impression de les connaître depuis toujours.', seeAll: 'Voir tous les lieux',
    categoriesLabel: 'Commencez par ce dont vous avez besoin', categoriesTitle: 'Une ville avec un peu de tout.', allCategories: 'Toutes les catégories',
    loadingCategories: 'Chargement des catégories...', noCategories: 'Aucune catégorie disponible pour le moment.',
    dayLabel: 'Empruntez notre', dayTitle: 'Une belle journée à Sour.', dayText: 'Sans se presser. Juste assez de vieille ville, de mer et de bonne cuisine.', saveDay: 'Enregistrer cette journée',
    goodToKnow: 'Bon à savoir', localContext: 'Un peu de contexte local.', localContextText: 'Les détails qui facilitent une sortie.',
    getAround: 'Se déplacer', stayConnected: 'Rester connecté', needHelp: 'Besoin d’aide ?', bestAddress: 'La meilleure adresse',
    backToTop: 'Haut de page', explorePlaces: 'Explorer les lieux', supportedBy: 'Soutenu par',
  },
} as const;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    return savedLanguage === 'ar' || savedLanguage === 'fr' ? savedLanguage : 'en';
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export function useTranslation() {
  const { language, setLanguage } = useLanguage();
  return { language, setLanguage, t: (key: keyof typeof translations.en) => translations[language][key] };
}