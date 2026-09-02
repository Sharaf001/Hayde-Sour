import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft, IdCard, LogOut } from 'lucide-react';
import { AppMark } from '@/App';
import { fetchAccount, isLoggedIn, logout, updateAccount, type AccountUpdateInput } from '@/lib/api';
import { useTranslation } from '@/lib/language';

export default function AccountPage() {
  const { tr } = useTranslation();
  const [, setLocation] = useLocation();
  const loggedIn = isLoggedIn();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AccountUpdateInput | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loggedIn) setLocation('/login?next=/account');
  }, [loggedIn, setLocation]);

  const { data: user, isLoading } = useQuery({
    queryKey: ['account'],
    queryFn: fetchAccount,
    enabled: loggedIn,
  });

  useEffect(() => {
    if (user && !form) {
      setForm({ firstName: user.firstName, lastName: user.lastName, address: user.address, dateOfBirth: user.dateOfBirth?.slice(0, 10) });
    }
  }, [user, form]);

  const saveMutation = useMutation({
    mutationFn: (input: AccountUpdateInput) => updateAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      setNotice('Saved.');
      window.setTimeout(() => setNotice(''), 2000);
    },
  });

  if (!loggedIn) return null;

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <div className="noise min-h-[100dvh] bg-[#e9dfcd]">
      <header className="border-b border-[#d7c9b4] bg-[#183c44]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 lg:px-10">
          <a href="/" data-testid="link-brand-home"><AppMark  /></a>
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#f9f0df]/80 hover:text-[#f1c575]" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" /> {tr('Back home', 'العودة للرئيسية', 'Accueil')}
            </a>
            <button onClick={handleLogout} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#f9f0df]/80 hover:text-[#f1c575]" data-testid="button-logout">
              <LogOut className="h-4 w-4" /> {tr('Log out', 'تسجيل الخروج', 'Deconnexion')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-5 py-14 lg:px-10 lg:py-20">
        <p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]">{tr('Account center', 'مركز الحساب', 'Centre du compte')}</p>
        <h1 className="font-display text-5xl leading-[.94] tracking-[-.04em] text-[#183c44] sm:text-6xl">{tr('Your details.', 'بياناتك.', 'Vos informations.')}</h1>

        {isLoading && <p className="mt-9 text-sm text-[#476269]">{tr('Loading your account...', 'جاري تحميل حسابك...', 'Chargement de votre compte...')}</p>}

        {user && (
          <>
            <div className="mt-10">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#476269]"><IdCard className="h-4 w-4 text-[#e58c70]" /> {tr('Your Sour Card', 'بطاقة صور الخاصة بك', 'Votre carte Sour')}</p>
              <SourCard fullName={fullName} code={user.sourCardCode} />
              <p className="mt-3 text-[11px] text-[#476269]/80">{tr('This is a membership card for the guide, not a payment card. Your code is permanent and unique to your account.', 'هذه بطاقة عضوية للدليل وليست بطاقة دفع. رمزك دائم وفريد لحسابك.', 'Cette carte est une carte d\'adhesion au guide, et non une carte de paiement. Votre code est permanent et propre a votre compte.')}</p>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); if (form) saveMutation.mutate(form); }}
              className="mt-10 rounded-2xl border border-[#d9cbb2] bg-[#f9f0df] p-6"
            >
              <p className="font-display text-2xl text-[#183c44]">{tr('Profile', 'الملف الشخصي', 'Profil')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Username', 'اسم المستخدم', 'Nom d\'utilisateur')}</label>
                  <input disabled value={user.username} className="mt-1.5 w-full rounded-lg border border-[#cfc0aa] bg-[#e9dfcd] px-3 py-2 text-sm text-[#476269]" data-testid="input-account-username" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Email', 'البريد الإلكتروني', 'Email')} {user.emailVerified && <span className="text-[#2f7a4d]">{tr('· verified', '· تم التحقق', '· verifie')}</span>}</label>
                  <input disabled value={user.email} className="mt-1.5 w-full rounded-lg border border-[#cfc0aa] bg-[#e9dfcd] px-3 py-2 text-sm text-[#476269]" data-testid="input-account-email" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Sour Card code', 'رمز بطاقة صور', 'Code de la carte Sour')}</label>
                  <input disabled value={user.sourCardCode} className="mt-1.5 w-full rounded-lg border border-[#cfc0aa] bg-[#e9dfcd] px-3 py-2 text-sm text-[#476269]" data-testid="input-account-card-code" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('First name', 'الاسم الأول', 'Prenom')}</label>
                  <input value={form?.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-1.5 w-full rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm text-[#183c44]" data-testid="input-account-first-name" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Last name', 'اسم العائلة', 'Nom')}</label>
                  <input value={form?.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="mt-1.5 w-full rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm text-[#183c44]" data-testid="input-account-last-name" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Address', 'العنوان', 'Adresse')}</label>
                  <input value={form?.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 w-full rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm text-[#183c44]" data-testid="input-account-address" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Date of birth', 'تاريخ الميلاد', 'Date de naissance')}</label>
                  <input type="date" value={form?.dateOfBirth || ''} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="mt-1.5 w-full rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm text-[#183c44]" data-testid="input-account-dob" />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <button type="submit" disabled={saveMutation.isPending} className="rounded-full bg-[#183c44] px-5 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#f9f0df] disabled:opacity-50" data-testid="button-save-account">
                  {saveMutation.isPending ? tr('Saving...', 'جاري الحفظ...', 'Enregistrement...') : tr('Save changes', 'حفظ التغييرات', 'Enregistrer les modifications')}
                </button>
                {notice && <span className="text-xs text-[#476269]" data-testid="text-account-notice">{notice}</span>}
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function SourCard({ fullName, code }: { fullName: string; code: string }) {
  const { tr } = useTranslation();
  const spacedCode = code.replace(/(\d{2})(?=\d)/g, '$1 ');
  return (
    <div
      className="relative aspect-[1.586/1] w-full max-w-[380px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#183c44] via-[#1f4a53] to-[#0f2a30] p-6 text-[#f9f0df] shadow-xl"
      data-testid="widget-sour-card"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#f1c575]/10" />
      <div className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-[#e58c70]/10" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-mono-custom text-[9px] uppercase tracking-[.2em] text-[#f1c575]">Hayde</p>
          <p className="font-display text-2xl leading-none">Sour Card</p>
        </div>
        <div className="h-8 w-11 rounded-md bg-gradient-to-br from-[#f1c575] to-[#d9a04f]" />
      </div>
      <p className="relative mt-9 font-mono-custom text-lg tracking-[.15em] sm:text-xl" data-testid="text-sour-card-code">{spacedCode}</p>
      <div className="relative mt-6 flex items-end justify-between">
        <div>
          <p className="font-mono-custom text-[8px] uppercase tracking-[.15em] text-[#f9f0df]/60">{tr('Card holder', 'حامل البطاقة', 'Titulaire de la carte')}</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[.04em]" data-testid="text-sour-card-name">{fullName}</p>
        </div>
        <p className="font-mono-custom text-[8px] uppercase tracking-[.1em] text-[#f9f0df]/40">{tr('Not a payment card', 'ليست بطاقة دفع', 'Pas une carte de paiement')}</p>
      </div>
    </div>
  );
}
