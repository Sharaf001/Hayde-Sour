import { useEffect, useState } from 'react';
import { Bookmark, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { AppMark } from '@/App';
import { isLoggedIn } from '@/lib/api';

// Delete the old isUserLoggedIn() function.

// ...existing code...


export function SiteNavbar() {
  const [location] = useLocation();
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
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 lg:px-10">
        <Link href="/" data-testid="link-brand-home">
          <AppMark />
        </Link>

        <nav className="flex items-center gap-4 sm:gap-7" aria-label="Main navigation">
          <Link
            href="/browse"
            className={`text-[10px] font-bold uppercase tracking-[.14em] transition sm:text-[11px] ${
              location === '/browse'
                ? 'text-[#f1c575]'
                : 'text-[#f9f0df]/80 hover:text-[#f1c575]'
            }`}
            data-testid="link-discover"
          >
            Discover
          </Link>

          <Link
            href="/nature"
            className={`text-[10px] font-bold uppercase tracking-[.14em] transition sm:text-[11px] ${
              location === '/nature'
                ? 'text-[#f1c575]'
                : 'text-[#f9f0df]/80 hover:text-[#f1c575]'
            }`}
            data-testid="link-nature"
          >
            Nature
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
      <span className="hidden sm:inline">Saved</span>
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
      <span className="hidden sm:inline">Account center</span>
    </Link>
  </>
) : (
  <Link
    href="/login"
    className="flex items-center gap-2 rounded-full border border-[#f9f0df]/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:border-[#f1c575] hover:text-[#f1c575] sm:px-4 sm:text-[11px]"
    data-testid="link-login"
  >
    <UserRound className="h-3.5 w-3.5" />
    <span>Log in</span>
  </Link>
)}
        </nav>
      </div>
    </header>
  );
}