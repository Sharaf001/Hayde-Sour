import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { AppMark } from '@/App';
import { PasswordInput } from '@/components/password-input';
import { useTranslation } from '@/lib/language';
import { forgotPassword, login, register, resendVerificationCode, resetPassword, verifyEmail } from '@/lib/api';

const emptyRegisterForm = { firstName: '', lastName: '', username: '', email: '', address: '', dateOfBirth: '', password: '' };

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export default function LoginPage() {
  const { tr } = useTranslation();
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const redirectTo = new URLSearchParams(rawSearch).get('next') || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(loginForm.username, loginForm.password);
      setLocation(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Something went wrong.', 'حدث خطأ ما.', 'Un probleme est survenu.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await register(registerForm);
      setPendingEmail(result.email);
      switchMode('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Something went wrong.', 'حدث خطأ ما.', 'Un probleme est survenu.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await verifyEmail(pendingEmail, verifyCode);
      setLocation(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Something went wrong.', 'حدث خطأ ما.', 'Un probleme est survenu.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    try {
      await resendVerificationCode(pendingEmail);
      setNotice(tr('A new code has been sent.', 'تم إرسال رمز جديد.', 'Un nouveau code a ete envoye.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Could not resend the code.', 'تعذر إعادة إرسال الرمز.', 'Impossible de renvoyer le code.'));
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await forgotPassword(forgotUsername);
      switchMode('reset');
      setNotice(tr('If that account has a verified email, a reset code has been sent.', 'إذا كان لهذا الحساب بريد إلكتروني موثق، فقد تم إرسال رمز إعادة التعيين.', 'Si ce compte possede un email verifie, un code de reinitialisation a ete envoye.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Something went wrong.', 'حدث خطأ ما.', 'Un probleme est survenu.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(forgotUsername, resetCode, resetPasswordValue);
      setLoginForm({ username: forgotUsername, password: '' });
      switchMode('login');
      setNotice(tr('Password updated - log in with your new password.', 'تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.', 'Mot de passe mis a jour. Connectez-vous avec votre nouveau mot de passe.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Something went wrong.', 'حدث خطأ ما.', 'Un probleme est survenu.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="noise flex min-h-[100dvh] items-center justify-center bg-[#e9dfcd] px-4 py-10">
      <div className="w-full max-w-sm">
        <a href="/" className="mb-8 flex justify-center" data-testid="link-brand-home"><AppMark /></a>
        <div className="rounded-2xl border border-[#d9cbb2] bg-[#f9f0df] p-8 shadow-sm">
          {(mode === 'login' || mode === 'register') && (
            <div className="mb-6 flex rounded-full border border-[#cfc0aa] p-1">
              <button type="button" onClick={() => switchMode('login')} className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-[.1em] transition ${mode === 'login' ? 'bg-[#183c44] text-[#f9f0df]' : 'text-[#476269]'}`} data-testid="button-mode-login">
                {tr('Log in', 'تسجيل الدخول', 'Connexion')}
              </button>
              <button type="button" onClick={() => switchMode('register')} className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-[.1em] transition ${mode === 'register' ? 'bg-[#183c44] text-[#f9f0df]' : 'text-[#476269]'}`} data-testid="button-mode-register">
                {tr('Sign up', 'إنشاء حساب', 'Créer un compte')}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <p className="font-display text-3xl text-[#183c44]">{tr('Welcome back.', 'مرحباً بعودتك.', 'Bon retour.')}</p>
              <p className="mt-2 text-sm text-[#476269]">{tr('Log in with your username to save places and leave ratings.', 'سجّل الدخول لحفظ الأماكن وإضافة التقييمات.', 'Connectez-vous pour enregistrer des lieux et laisser des avis.')}</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Username', 'اسم المستخدم', 'Nom d\'utilisateur')}</label>
              <input required autoComplete="username" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-username" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Password', 'كلمة المرور', 'Mot de passe')}</label>
              <div className="mt-1.5">
                <PasswordInput value={loginForm.password} onChange={(v) => setLoginForm({ ...loginForm, password: v })} autoComplete="current-password" required testId="input-password" />
              </div>
              <button type="button" onClick={() => switchMode('forgot')} className="mt-2 text-[11px] font-semibold text-[#476269] underline hover:text-[#183c44]" data-testid="link-forgot-password">{tr('Forgot password?', 'هل نسيت كلمة المرور؟', 'Mot de passe oublié ?')}</button>

              {notice && <p className="mt-4 text-sm text-[#2f7a4d]" data-testid="text-auth-notice">{notice}</p>}
              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? tr('Please wait…', 'يرجى الانتظار…', 'Veuillez patienter…') : tr('Log in', 'تسجيل الدخول', 'Connexion')}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <p className="font-display text-3xl text-[#183c44]">{tr('Create an account.', 'أنشئ حساباً.', 'Créer un compte.')}</p>
              <p className="mt-2 text-sm text-[#476269]">{tr('A few details and you\'re set - we\'ll email you a code to confirm.', 'بعض التفاصيل وسيكون حسابك جاهزاً. سنرسل لك رمزاً للتأكيد عبر البريد الإلكتروني.', 'Quelques informations et c\'est fait. Nous vous enverrons un code de confirmation par email.')}</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('First name', 'الاسم الأول', 'Prenom')}</label>
                  <input required value={registerForm.firstName} onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-first-name" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Last name', 'اسم العائلة', 'Nom')}</label>
                  <input required value={registerForm.lastName} onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-last-name" />
                </div>
              </div>

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Email', 'البريد الإلكتروني', 'Email')}</label>
              <input required type="email" autoComplete="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-email" />
              <p className="mt-1.5 text-[11px] text-[#476269]">{tr('We\'ll send a verification code here before your account is created.', 'سنرسل رمز التحقق إلى هذا البريد قبل إنشاء حسابك.', 'Nous enverrons un code de verification ici avant la creation de votre compte.')}</p>

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Username', 'اسم المستخدم', 'Nom d\'utilisateur')}</label>
              <input required pattern="[a-zA-Z0-9_]{3,20}" title="3-20 characters: letters, numbers, underscores only" autoComplete="username" value={registerForm.username} onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-new-username" />
              <p className="mt-1.5 text-[11px] text-[#476269]">{tr('This is what you\'ll log in with - 3-20 characters, letters/numbers/underscores.', 'هذا هو اسم الدخول الخاص بك: من 3 إلى 20 حرفاً، أحرف وأرقام وشرطات سفلية فقط.', 'C\'est votre identifiant de connexion : 3 a 20 caracteres, lettres, chiffres et tirets bas uniquement.')}</p>

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Address', 'العنوان', 'Adresse')}</label>
              <input required value={registerForm.address} onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-address" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Date of birth', 'تاريخ الميلاد', 'Date de naissance')}</label>
              <input required type="date" value={registerForm.dateOfBirth} onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-date-of-birth" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Password', 'كلمة المرور', 'Mot de passe')}</label>
              <div className="mt-1.5">
                <PasswordInput value={registerForm.password} onChange={(v) => setRegisterForm({ ...registerForm, password: v })} autoComplete="new-password" minLength={6} required testId="input-new-password" />
              </div>
              <p className="mt-1.5 text-[11px] text-[#476269]">{tr('At least 6 characters.', 'ستة أحرف على الأقل.', 'Au moins 6 caracteres.')}</p>

              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? tr('Please wait...', 'يرجى الانتظار...', 'Veuillez patienter...') : tr('Create account', 'إنشاء حساب', 'Creer un compte')}
              </button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerify}>
              <p className="font-display text-3xl text-[#183c44]">{tr('Check your email.', 'تحقق من بريدك الإلكتروني.', 'Verifiez votre email.')}</p>
              <p className="mt-2 text-sm text-[#476269]">{tr('We sent a 6-digit code to', 'أرسلنا رمزاً من 6 أرقام إلى', 'Nous avons envoye un code a 6 chiffres a')} <span className="font-semibold text-[#183c44]">{pendingEmail}</span>. {tr('Enter it below to finish creating your account.', 'أدخله أدناه لإتمام إنشاء حسابك.', 'Entrez-le ci-dessous pour terminer la creation de votre compte.')}</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Verification code', 'رمز التحقق', 'Code de verification')}</label>
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-center text-lg tracking-[.3em] text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-verify-code" />

              <button type="button" onClick={handleResend} className="mt-3 text-[11px] font-semibold text-[#476269] underline hover:text-[#183c44]" data-testid="button-resend-code">{tr('Resend code', 'إعادة إرسال الرمز', 'Renvoyer le code')}</button>

              {notice && <p className="mt-4 text-sm text-[#2f7a4d]" data-testid="text-auth-notice">{notice}</p>}
              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? tr('Please wait...', 'يرجى الانتظار...', 'Veuillez patienter...') : tr('Verify & create account', 'تحقق وأنشئ الحساب', 'Verifier et creer un compte')}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot}>
              <p className="font-display text-3xl text-[#183c44]">{tr('Forgot your password?', 'هل نسيت كلمة المرور؟', 'Mot de passe oublie ?')}</p>
              <p className="mt-2 text-sm text-[#476269]">{tr('Enter your username and we\'ll email a reset code to the address on your account.', 'أدخل اسم المستخدم وسنرسل رمز إعادة التعيين إلى بريد حسابك.', 'Entrez votre nom d\'utilisateur et nous enverrons un code de reinitialisation a l\'adresse de votre compte.')}</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Username', 'اسم المستخدم', 'Nom d\'utilisateur')}</label>
              <input required autoComplete="username" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-forgot-username" />

              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? tr('Please wait...', 'يرجى الانتظار...', 'Veuillez patienter...') : tr('Send reset code', 'إرسال رمز إعادة التعيين', 'Envoyer le code de reinitialisation')}
              </button>
              <button type="button" onClick={() => switchMode('login')} className="mt-4 block w-full text-center text-[11px] font-semibold text-[#476269] underline hover:text-[#183c44]" data-testid="link-back-to-login">{tr('Back to log in', 'العودة لتسجيل الدخول', 'Retour a la connexion')}</button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset}>
              <p className="font-display text-3xl text-[#183c44]">{tr('Reset your password.', 'أعد تعيين كلمة المرور.', 'Reinitialisez votre mot de passe.')}</p>
              <p className="mt-2 text-sm text-[#476269]">{tr('Enter the code we emailed you, and a new password.', 'أدخل الرمز الذي أرسلناه إليك وكلمة مرور جديدة.', 'Entrez le code que nous vous avons envoye ainsi qu\'un nouveau mot de passe.')}</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('Reset code', 'رمز إعادة التعيين', 'Code de reinitialisation')}</label>
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-center text-lg tracking-[.3em] text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-reset-code" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">{tr('New password', 'كلمة مرور جديدة', 'Nouveau mot de passe')}</label>
              <div className="mt-1.5">
                <PasswordInput value={resetPasswordValue} onChange={setResetPasswordValue} autoComplete="new-password" minLength={6} required testId="input-reset-password" />
              </div>

              {notice && <p className="mt-4 text-sm text-[#2f7a4d]" data-testid="text-auth-notice">{notice}</p>}
              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? tr('Please wait...', 'يرجى الانتظار...', 'Veuillez patienter...') : tr('Reset password', 'إعادة تعيين كلمة المرور', 'Reinitialiser le mot de passe')}
              </button>
            </form>
          )}
        </div>
        <a href="/" className="mt-6 block text-center text-xs font-bold uppercase tracking-[.1em] text-[#476269] hover:text-[#183c44]" data-testid="link-back-home">{tr('Back home', 'العودة للرئيسية', 'Retour à l’accueil')}</a>
      </div>
    </div>
  );
}
