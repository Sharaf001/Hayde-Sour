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
    discover: 'Discover', nature: 'Nature', saved: 'Saved', account: 'Account center', login: 'Log in', backHome: 'Back home', logout: 'Log out',
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
    browseLabel: 'Browse the city', browseTitle: 'Find your Spot.', browseDesc: 'Search by name, neighbourhood, or the feeling you are after.',
    searchPlaceholder: 'Search food, stays, services...', clearSearch: 'Clear search',
    loadingGuide: 'Loading the guide...', fetchingPlaces: 'Fetching the latest places from the database.',
    apiError: 'Couldn\'t reach the API.', serverError: 'Make sure the backend server in /server is running and VITE_API_URL points to it.',
    noResults: 'That trail is quiet for now.', noResultsDesc: 'Try a broader search, or let us take you back to the full local edit.', showAllPlaces: 'Show all places',
    placesInGuide: 'places in the guide · curated for real life',
    savedLabel: 'Your list', savedTitle: 'Saved spots.', savedDesc: 'Everything you have bookmarked while browsing Sour, kept here for next time.',
    needLogin: 'Log in to see your saved spots.', needLoginDesc: 'Your saved places are tied to your account so they follow you across devices.',
    loadingSaved: 'Loading your saved spots...', notSavedYet: 'Nothing saved yet.', notSavedDesc: 'Tap the bookmark icon on any place while browsing to keep it here.', browsePlaces: 'Browse places',
    natureLabel: 'Where to go nature', natureTitle: 'Open air, open water.', natureDesc: 'Coastline, ruins and the quieter corners of Sour worth stepping outside for.',
    loading: 'Loading...', nothingHere: 'Nothing here yet.', nothingHereDesc: 'Entries added in the admin panel will show up here.',
    noRatings: 'No community ratings yet', yourRating: 'Your rating', rateThisPlace: 'Rate this place', loginToRate: 'Log in to rate this place',
    where: 'Where', hours: 'Hours', localNote: 'Local note', call: 'Call', tapToView: 'Tap to view',
    getDirections: 'Get directions', saveSpot: 'Save spot', remove: 'Remove', unsaveSpot: 'Unsave spot', instagram: 'Instagram', website: 'Website', viewMenu: 'View menu',
    welcomeBack: 'Welcome back.', loginDesc: 'Log in with your username to save places and leave ratings.', pleasewait: 'Please wait...',
    createAccount: 'Create an account.', createDesc: 'A few details and you\'re set - we\'ll email you a code to confirm.',
    username: 'Username', password: 'Password', forgotPassword: 'Forgot password?',
    firstName: 'First name', lastName: 'Last name', email: 'Email', address: 'Address', dob: 'Date of birth',
    verificationSent: 'We\'ll send a verification code here before your account is created.',
    usernameHelp: 'This is what you\'ll log in with - 3-20 characters, letters/numbers/underscores.', passwordHelp: 'At least 6 characters.',
    checkEmail: 'Check your email.', verificationDesc: 'We sent a 6-digit code to', enterCodeBelow: 'Enter it below to finish creating your account.', verificationCode: 'Verification code',
    resendCode: 'Resend code', verifyCreate: 'Verify & create account', submitAuth: 'Submit',
    forgotPasswordTitle: 'Forgot your password?', forgotPasswordDesc: 'Enter your username and we\'ll email a reset code to the address on your account.', sendResetCode: 'Send reset code',
    backToLogin: 'Back to log in', resetPasswordTitle: 'Reset your password.', resetPasswordDesc: 'Enter the code we emailed you, and a new password.', resetCode: 'Reset code', newPassword: 'New password', resetPassword: 'Reset password',
    accountLabel: 'Account center', accountTitle: 'Your details.', loadingAccount: 'Loading your account...',
    yourSourCard: 'Your Sour Card', sourCardDesc: 'This is a membership card for the guide, not a payment card. Your code is permanent and unique to your account.',
    profile: 'Profile', cardHolder: 'Card holder', notPaymentCard: 'Not a payment card', emailVerified: '· verified', sourCardCode: 'Sour Card code',
    saveChanges: 'Save changes', saving: 'Saving...',
    notFound: '404 Page Not Found', notFoundMsg: 'Did you forget to add the page to the router?',
  },
  ar: {
    discover: 'اكتشف', nature: 'الطبيعة', saved: 'المحفوظات', account: 'الحساب', login: 'تسجيل الدخول', backHome: 'العودة للرئيسية', logout: 'تسجيل الخروج',
    heroLocation: 'صور، جنوب لبنان', heroLineOne: 'هنا تبدأ', heroLineTwo: 'الأيام الجميلة', heroLineThree: '.',
    heroText: 'دليل دافئ وعملي لصور - ابدأ من هنا.', heroSearch: 'جرب "اطلالة بحرية" او "قهوة"...', search: 'بحث',
    localShortcut: 'الدليل المحلي', localShortcutText: 'طرق سهلة لاكتشاف المدينة.',
    featuredLabel: 'أماكن نحبها', featuredTitle: 'اختيارات محلية، لا قائمة صاخبة.',
    featuredText: 'أماكن تجعلك تشعر أنك تعرفها منذ سنوات.', seeAll: 'شاهد كل الأماكن',
    categoriesLabel: 'ابدأ بما تحتاجه', categoriesTitle: 'مدينة فيها القليل من كل شيء.', allCategories: 'كل الفئات',
    loadingCategories: 'جار تحميل الفئات...', noCategories: 'لا توجد فئات متاحة بعد.',
    dayLabel: 'استعر يوم', dayTitle: 'يوم جميل في صور.', dayText: 'بلا استعجال. القليل من المدينة القديمة والبحر وطعام لذيذ.', saveDay: 'احفظ هذا اليوم',
    goodToKnow: 'من الجيد أن تعرف', localContext: 'سياق محلي بسيط.', localContextText: 'تفاصيل تجعل يومك أسهل.',
    getAround: 'التنقل', stayConnected: 'ابق متصلا', needHelp: 'تحتاج مساعدة؟', bestAddress: 'أفضل عنوان',
    backToTop: 'العودة للأعلى', explorePlaces: 'استكشف الأماكن', supportedBy: 'بدعم من',
    browseLabel: 'اكتشف المدينة', browseTitle: 'اعثر على مكانك.', browseDesc: 'ابحث بالاسم أو الحي أو التجربة التي تريدها.',
    searchPlaceholder: 'ابحث عن الطعام والإقامة والخدمات...', clearSearch: 'مسح البحث',
    loadingGuide: 'جار تحميل الدليل...', fetchingPlaces: 'جاري جلب أحدث الأماكن من قاعدة البيانات.',
    apiError: 'لا يمكن الوصول إلى الخادم.', serverError: 'تأكد من تشغيل خادم الواجهة الخلفية في /server وأن VITE_API_URL يشير إليه.',
    noResults: 'هذا الطريق هادئ الآن.', noResultsDesc: 'جرب بحثا أوسع، أو دعنا نعيدك إلى الدليل المحلي الكامل.', showAllPlaces: 'عرض جميع الأماكن',
    placesInGuide: 'أماكن في الدليل · منسقة للحياة الحقيقية',
    savedLabel: 'قائمتك', savedTitle: 'الأماكن المحفوظة.', savedDesc: 'جميع الأماكن التي علمت عليها بالعلامة أثناء التصفح في صور، محفوظة هنا للمرة القادمة.',
    needLogin: 'سجل الدخول لرؤية أماكنك المحفوظة.', needLoginDesc: 'أماكنك المحفوظة مرتبطة بحسابك حتى تتابعك عبر الأجهزة.',
    loadingSaved: 'جار تحميل أماكنك المحفوظة...', notSavedYet: 'لم تحفظ شيئا بعد.', notSavedDesc: 'انقر على أيقونة الكتاب على أي مكان أثناء التصفح لحفظه هنا.', browsePlaces: 'استكشف الأماكن',
    natureLabel: 'وجهات الطبيعة', natureTitle: 'هواء طلق ومياه مفتوحة.', natureDesc: 'الساحل والآثار والزوايا الهادئة في صور التي تستحق الزيارة.',
    loading: 'جاري التحميل...', nothingHere: 'لا يوجد شيء هنا بعد.', nothingHereDesc: 'ستظهر الإدخالات المضافة من لوحة المسؤول هنا.',
    noRatings: 'لا توجد تقييمات مجتمع حتى الآن', yourRating: 'تقييمك', rateThisPlace: 'قيم هذا المكان', loginToRate: 'سجل الدخول لتقييم هذا المكان',
    where: 'الموقع', hours: 'الساعات', localNote: 'ملاحظة محلية', call: 'اتصل', tapToView: 'انقر للعرض',
    getDirections: 'احصل على الاتجاهات', saveSpot: 'احفظ المكان', remove: 'احذف', unsaveSpot: 'إلغاء حفظ المكان', instagram: 'انستجرام', website: 'الموقع الإلكترونى', viewMenu: 'عرض القائمة',
    welcomeBack: 'مرحبا بعودتك.', loginDesc: 'سجل الدخول باسم المستخدم لحفظ الأماكن وإضافة التقييمات.', pleasewait: 'يرجى الانتظار...',
    createAccount: 'أنشئ حسابا.', createDesc: 'بعض التفاصيل وسيكون لديك حساب - سنرسل لك رمزا عبر البريد الإلكتروني للتأكيد.',
    username: 'اسم المستخدم', password: 'كلمة المرور', forgotPassword: 'هل نسيت كلمة المرور؟',
    firstName: 'الاسم الأول', lastName: 'اسم العائلة', email: 'البريد الإلكتروني', address: 'العنوان', dob: 'تاريخ الميلاد',
    verificationSent: 'سنرسل رمز التحقق إلى هنا قبل إنشاء حسابك.',
    usernameHelp: 'هذا ما ستسجل به الدخول - 3-20 حرفا، حروف/أرقام/شرطات سفلية فقط.', passwordHelp: 'ستة أحرف على الأقل.',
    checkEmail: 'تحقق من بريدك الإلكتروني.', verificationDesc: 'أرسلنا رمز من 6 أرقام إلى', enterCodeBelow: 'أدخله أدناه لإنهاء إنشاء حسابك.', verificationCode: 'رمز التحقق',
    resendCode: 'إعادة إرسال الرمز', verifyCreate: 'تحقق وأنشئ حسابك', submitAuth: 'إرسال',
    forgotPasswordTitle: 'هل نسيت كلمة المرور؟', forgotPasswordDesc: 'أدخل اسم المستخدم وسنرسل لك رمز إعادة تعيين على العنوان المسجل في حسابك.', sendResetCode: 'إرسال رمز إعادة التعيين',
    backToLogin: 'العودة لتسجيل الدخول', resetPasswordTitle: 'إعادة تعيين كلمة المرور.', resetPasswordDesc: 'أدخل الرمز الذي أرسلناه لك وكلمة مرور جديدة.', resetCode: 'رمز إعادة التعيين', newPassword: 'كلمة مرور جديدة', resetPassword: 'إعادة تعيين كلمة المرور',
    accountLabel: 'مركز الحساب', accountTitle: 'بياناتك.', loadingAccount: 'جاري تحميل حسابك...',
    yourSourCard: 'بطاقة صور الخاصة بك', sourCardDesc: 'هذه بطاقة عضوية للدليل، وليست بطاقة دفع. رمزك دائم وفريد من نوعه لحسابك.',
    profile: 'الملف الشخصي', cardHolder: 'حامل البطاقة', notPaymentCard: 'ليست بطاقة دفع', emailVerified: '· تم التحقق', sourCardCode: 'رمز بطاقة صور',
    saveChanges: 'حفظ التغييرات', saving: 'جاري الحفظ...',
    notFound: '404 الصفحة غير موجودة', notFoundMsg: 'هل نسيت إضافة الصفحة إلى جهاز التوجيه؟',
  },
  fr: {
    discover: 'Decouvrir', nature: 'Nature', saved: 'Enregistres', account: 'Mon compte', login: 'Connexion', backHome: 'Accueil', logout: 'Deconnexion',
    heroLocation: 'Tyr, Sud-Liban', heroLineOne: 'Ici commencent', heroLineTwo: 'les beaux jours', heroLineThree: '.',
    heroText: 'Un guide chaleureux et pratique de Sour - Commencez ici.', heroSearch: 'Essayez « vue mer », « café »...', search: 'Rechercher',
    localShortcut: 'Le raccourci local', localShortcutText: 'Des repères pour trouver vos marques en ville.',
    featuredLabel: 'Quelques adresses que nous aimons', featuredTitle: 'Le choix local, pas la liste la plus bruyante.',
    featuredText: 'Des lieux qui donnent l\'impression de les connaitre depuis toujours.', seeAll: 'Voir tous les lieux',
    categoriesLabel: 'Commencez par ce dont vous avez besoin', categoriesTitle: 'Une ville avec un peu de tout.', allCategories: 'Toutes les categories',
    loadingCategories: 'Chargement des categories...', noCategories: 'Aucune categorie disponible pour le moment.',
    dayLabel: 'Empruntez notre', dayTitle: 'Une belle journee a Sour.', dayText: 'Sans se presser. Juste assez de vieille ville, de mer et de bonne cuisine.', saveDay: 'Enregistrer cette journee',
    goodToKnow: 'Bon a savoir', localContext: 'Un peu de contexte local.', localContextText: 'Les details qui facilitent une sortie.',
    getAround: 'Se deplacer', stayConnected: 'Rester connecte', needHelp: 'Besoin d\'aide ?', bestAddress: 'La meilleure adresse',
    backToTop: 'Haut de page', explorePlaces: 'Explorer les lieux', supportedBy: 'Soutenu par',
    browseLabel: 'Explorer la ville', browseTitle: 'Trouvez votre endroit.', browseDesc: 'Recherchez par nom, quartier ou ambiance.',
    searchPlaceholder: 'Rechercher restaurants, sejours, services...', clearSearch: 'Effacer la recherche',
    loadingGuide: 'Chargement du guide...', fetchingPlaces: 'Recuperation des derniers lieux de la base de donnees.',
    apiError: 'Impossible de joindre l\'API.', serverError: 'Assurez-vous que le serveur backend dans /server est en cours d\'execution et que VITE_API_URL pointe vers lui.',
    noResults: 'Ce sentier est calme pour le moment.', noResultsDesc: 'Essayez une recherche plus large, ou laissez-nous vous ramener au guide local complet.', showAllPlaces: 'Afficher tous les lieux',
    placesInGuide: 'lieux dans le guide · choisis pour la vraie vie',
    savedLabel: 'Votre liste', savedTitle: 'Lieux enregistres.', savedDesc: 'Tout ce que vous avez mis en signet en parcourant Sour, conserve ici pour la prochaine fois.',
    needLogin: 'Connectez-vous pour voir vos lieux enregistres.', needLoginDesc: 'Vos lieux enregistres sont lies a votre compte pour qu\'ils vous suivent sur tous les appareils.',
    loadingSaved: 'Chargement de vos lieux enregistres...', notSavedYet: 'Rien d\'enregistre pour le moment.', notSavedDesc: 'Appuyez sur l\'icone de signet sur n\'importe quel lieu en naviguant pour le conserver ici.', browsePlaces: 'Parcourir les lieux',
    natureLabel: 'Nature a decouvrir', natureTitle: 'Grand air, eau libre.', natureDesc: 'Le littoral, les ruines et les coins calmes de Sour a decouvrir.',
    loading: 'Chargement...', nothingHere: 'Rien pour le moment.', nothingHereDesc: 'Les entrees ajoutees dans le panneau d\'administration apparaitront ici.',
    noRatings: 'Pas encore d\'avis communautaire', yourRating: 'Votre avis', rateThisPlace: 'Noter ce lieu', loginToRate: 'Connectez-vous pour noter ce lieu',
    where: 'Ou', hours: 'Horaires', localNote: 'Note locale', call: 'Appeler', tapToView: 'Appuyez pour afficher',
    getDirections: 'Obtenir l\'itineraire', saveSpot: 'Enregistrer ce lieu', remove: 'Supprimer', unsaveSpot: 'Retirer des enregistres', instagram: 'Instagram', website: 'Site web', viewMenu: 'Afficher le menu',
    welcomeBack: 'Bon retour.', loginDesc: 'Connectez-vous avec votre nom d\'utilisateur pour enregistrer des lieux et laisser des avis.', pleasewait: 'Veuillez patienter...',
    createAccount: 'Creer un compte.', createDesc: 'Quelques details et c\'est fait - nous vous enverrons un code par email pour confirmer.',
    username: 'Nom d\'utilisateur', password: 'Mot de passe', forgotPassword: 'Mot de passe oublie ?',
    firstName: 'Prenom', lastName: 'Nom', email: 'Email', address: 'Adresse', dob: 'Date de naissance',
    verificationSent: 'Nous enverrons un code de verification ici avant la creation de votre compte.',
    usernameHelp: 'C\'est ce avec quoi vous allez vous connecter - 3-20 caracteres, lettres/chiffres/tirets bas uniquement.', passwordHelp: 'Au moins 6 caracteres.',
    checkEmail: 'Verifiez votre email.', verificationDesc: 'Nous avons envoye un code a 6 chiffres a', enterCodeBelow: 'Entrez-le ci-dessous pour terminer la creation de votre compte.', verificationCode: 'Code de verification',
    resendCode: 'Renvoyer le code', verifyCreate: 'Verifier et creer un compte', submitAuth: 'Soumettre',
    forgotPasswordTitle: 'Mot de passe oublie ?', forgotPasswordDesc: 'Entrez votre nom d\'utilisateur et nous enverrons un code de reinitialisation a l\'adresse de votre compte.', sendResetCode: 'Envoyer le code de reinitialisation',
    backToLogin: 'Retour a la connexion', resetPasswordTitle: 'Reinitialisez votre mot de passe.', resetPasswordDesc: 'Entrez le code que nous vous avez envoye et un nouveau mot de passe.', resetCode: 'Code de reinitialisation', newPassword: 'Nouveau mot de passe', resetPassword: 'Reinitialiser le mot de passe',
    accountLabel: 'Centre du compte', accountTitle: 'Vos informations.', loadingAccount: 'Chargement de votre compte...',
    yourSourCard: 'Votre carte Sour', sourCardDesc: 'C\'est une carte d\'adhesion au guide, pas une carte de paiement. Votre code est permanent et unique a votre compte.',
    profile: 'Profil', cardHolder: 'Titulaire de la carte', notPaymentCard: 'Pas une carte de paiement', emailVerified: '· verifie', sourCardCode: 'Code de la carte Sour',
    saveChanges: 'Enregistrer les modifications', saving: 'Enregistrement...',
    notFound: '404 Page non trouvee', notFoundMsg: 'Avez-vous oublie d\'ajouter la page au routeur ?',
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
  return {
    language,
    setLanguage,
    t: (key: keyof typeof translations.en) => translations[language][key],
    tr: (en: string, ar: string, fr: string) => {
      if (language === 'ar') return ar;
      if (language === 'fr') return fr;
      return en;
    },
  };
}
