import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { AppMark } from '@/App';
import { PasswordInput } from '@/components/password-input';
import { forgotPassword, login, register, resendVerificationCode, resetPassword, verifyEmail } from '@/lib/api';

const emptyRegisterForm = { firstName: '', lastName: '', username: '', email: '', address: '', dateOfBirth: '', password: '' };

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export default function LoginPage() {
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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    try {
      await resendVerificationCode(pendingEmail);
      setNotice('A new code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await forgotPassword(forgotUsername);
      switchMode('reset');
      setNotice('If that account has a verified email, a reset code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
      setNotice('Password updated - log in with your new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
                Log in
              </button>
              <button type="button" onClick={() => switchMode('register')} className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-[.1em] transition ${mode === 'register' ? 'bg-[#183c44] text-[#f9f0df]' : 'text-[#476269]'}`} data-testid="button-mode-register">
                Sign up
              </button>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <p className="font-display text-3xl text-[#183c44]">Welcome back.</p>
              <p className="mt-2 text-sm text-[#476269]">Log in with your username to save places and leave ratings.</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Username</label>
              <input required autoComplete="username" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-username" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Password</label>
              <div className="mt-1.5">
                <PasswordInput value={loginForm.password} onChange={(v) => setLoginForm({ ...loginForm, password: v })} autoComplete="current-password" required testId="input-password" />
              </div>
              <button type="button" onClick={() => switchMode('forgot')} className="mt-2 text-[11px] font-semibold text-[#476269] underline hover:text-[#183c44]" data-testid="link-forgot-password">Forgot password?</button>

              {notice && <p className="mt-4 text-sm text-[#2f7a4d]" data-testid="text-auth-notice">{notice}</p>}
              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? 'Please wait…' : 'Log in'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <p className="font-display text-3xl text-[#183c44]">Create an account.</p>
              <p className="mt-2 text-sm text-[#476269]">A few details and you're set - we'll email you a code to confirm.</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">First name</label>
                  <input required value={registerForm.firstName} onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-first-name" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Last name</label>
                  <input required value={registerForm.lastName} onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-last-name" />
                </div>
              </div>

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Email</label>
              <input required type="email" autoComplete="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-email" />
              <p className="mt-1.5 text-[11px] text-[#476269]">We'll send a verification code here before your account is created.</p>

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Username</label>
              <input required pattern="[a-zA-Z0-9_]{3,20}" title="3-20 characters: letters, numbers, underscores only" autoComplete="username" value={registerForm.username} onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-new-username" />
              <p className="mt-1.5 text-[11px] text-[#476269]">This is what you'll log in with - 3-20 characters, letters/numbers/underscores.</p>

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Address</label>
              <input required value={registerForm.address} onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-address" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Date of birth</label>
              <input required type="date" value={registerForm.dateOfBirth} onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-date-of-birth" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Password</label>
              <div className="mt-1.5">
                <PasswordInput value={registerForm.password} onChange={(v) => setRegisterForm({ ...registerForm, password: v })} autoComplete="new-password" minLength={6} required testId="input-new-password" />
              </div>
              <p className="mt-1.5 text-[11px] text-[#476269]">At least 6 characters.</p>

              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? 'Please wait…' : 'Create account'}
              </button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerify}>
              <p className="font-display text-3xl text-[#183c44]">Check your email.</p>
              <p className="mt-2 text-sm text-[#476269]">We sent a 6-digit code to <span className="font-semibold text-[#183c44]">{pendingEmail}</span>. Enter it below to finish creating your account.</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Verification code</label>
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-center text-lg tracking-[.3em] text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-verify-code" />

              <button type="button" onClick={handleResend} className="mt-3 text-[11px] font-semibold text-[#476269] underline hover:text-[#183c44]" data-testid="button-resend-code">Resend code</button>

              {notice && <p className="mt-4 text-sm text-[#2f7a4d]" data-testid="text-auth-notice">{notice}</p>}
              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? 'Please wait…' : 'Verify & create account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot}>
              <p className="font-display text-3xl text-[#183c44]">Forgot your password?</p>
              <p className="mt-2 text-sm text-[#476269]">Enter your username and we'll email a reset code to the address on your account.</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Username</label>
              <input required autoComplete="username" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-forgot-username" />

              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? 'Please wait…' : 'Send reset code'}
              </button>
              <button type="button" onClick={() => switchMode('login')} className="mt-4 block w-full text-center text-[11px] font-semibold text-[#476269] underline hover:text-[#183c44]" data-testid="link-back-to-login">Back to log in</button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset}>
              <p className="font-display text-3xl text-[#183c44]">Reset your password.</p>
              <p className="mt-2 text-sm text-[#476269]">Enter the code we emailed you, and a new password.</p>

              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Reset code</label>
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} className="mt-1.5 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-center text-lg tracking-[.3em] text-[#183c44] outline-none focus:border-[#183c44]" data-testid="input-reset-code" />

              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">New password</label>
              <div className="mt-1.5">
                <PasswordInput value={resetPasswordValue} onChange={setResetPasswordValue} autoComplete="new-password" minLength={6} required testId="input-reset-password" />
              </div>

              {notice && <p className="mt-4 text-sm text-[#2f7a4d]" data-testid="text-auth-notice">{notice}</p>}
              {error && <p className="mt-4 text-sm text-[#c1543f]" data-testid="text-auth-error">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50" data-testid="button-submit-auth">
                {submitting ? 'Please wait…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
        <a href="/" className="mt-6 block text-center text-xs font-bold uppercase tracking-[.1em] text-[#476269] hover:text-[#183c44]" data-testid="link-back-home">Back home</a>
      </div>
    </div>
  );
}
