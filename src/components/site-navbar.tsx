import { useEffect, useState } from 'react';
import { Bookmark, Globe2, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { AppMark } from '@/App';
import { isLoggedIn } from '@/lib/api';
import { languageOptions, useTranslation } from '@/lib/language';

// Delete the old isUserLoggedIn() function.

// ...existing code...


export function SiteNavbar() {
  const [location] = useLocation();
  const { language, setLanguage, t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  const isHomePage = location === '/';
  const headerStyle =
  isHomePage && !scrolled
    ? 'absolute bg-transparent'
    : 'fixed bg-[#183c44]/90 shadow-lg backdrop-blur-xl';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Refresh login state after navigation, including returning from /login.
  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [location]);

  // ...existing headerStyle code...

  return (
    <header
      className={`inset-x-0 top-0 z-30 transition-all duration-300 ${headerStyle}`}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-5 lg:px-10">
        <Link href="/" data-testid="link-brand-home">
          <AppMark />
        </Link>

        <nav className="flex shrink-0 items-center gap-2 sm:gap-7" aria-label="Main navigation">
          <Link
            href="/browse"
            className={`text-[9px] font-bold uppercase tracking-[.08em] transition sm:text-[11px] sm:tracking-[.14em] ${
              location === '/browse'
                ? 'text-[#f1c575]'
                : 'text-[#f9f0df]/80 hover:text-[#f1c575]'
            }`}
            data-testid="link-discover"
          >
            {t('discover')}
          </Link>

          <Link
            href="/nature"
            className={`text-[9px] font-bold uppercase tracking-[.08em] transition sm:text-[11px] sm:tracking-[.14em] ${
              location === '/nature'
                ? 'text-[#f1c575]'
                : 'text-[#f9f0df]/80 hover:text-[#f1c575]'
            }`}
            data-testid="link-nature"
          >
            {t('nature')}
          </Link>

          <Link
            href="/history"
            className={`text-[9px] font-bold uppercase tracking-[.08em] transition sm:text-[11px] sm:tracking-[.14em] ${
              location === '/history'
                ? 'text-[#f1c575]'
                : 'text-[#f9f0df]/80 hover:text-[#f1c575]'
            }`}
            data-testid="link-history"
          >
            {t('history')}
          </Link>

          {loggedIn ? (
  <>
    <Link
      href="/saved"
      className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] transition sm:text-[11px] ${
        location === '/saved'
          ? 'text-[#f1c575]'
          : 'text-[#f9f0df]/80 hover:text-[#f1c575]'
      }`}
      data-testid="link-saved"
    >
      <Bookmark className="h-4 w-4" />
      <span className="hidden sm:inline">{t('saved')}</span>
    </Link>

    <Link
      href="/account"
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] transition sm:px-4 sm:text-[11px] ${
        location === '/account'
          ? 'border-[#f1c575] text-[#f1c575]'
          : 'border-[#f9f0df]/40 text-[#f9f0df] hover:border-[#f1c575] hover:text-[#f1c575]'
      }`}
      data-testid="link-account-center"
    >
      <UserRound className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t('account')}</span>
    </Link>
  </>
) : (
  <Link
    href="/login"
    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f9f0df]/40 text-[#f9f0df] transition hover:border-[#f1c575] hover:text-[#f1c575] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-[11px] sm:font-bold sm:uppercase sm:tracking-[.12em]"
    aria-label={t('login')}
    data-testid="link-login"
  >
    <UserRound className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">{t('login')}</span>
  </Link>
)}
          <label className="flex h-9 items-center gap-1 rounded-full border border-[#f9f0df]/40 px-2 text-[#f9f0df] sm:h-auto sm:px-3 sm:py-2" aria-label="Select language">
            <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as typeof language)}
              className="w-8 bg-transparent text-[9px] font-bold uppercase outline-none sm:w-14 sm:text-[10px]"
              aria-label="Language"
              data-testid="select-language"
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code} className="text-[#183c44]">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </nav>
      </div>
    </header>
  );
}