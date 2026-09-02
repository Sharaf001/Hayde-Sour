import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { BedDouble, Clock3, Coffee, Search, Star, Utensils, Waves, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchListings } from '@/lib/api';
import { useTranslation } from '@/lib/language';

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

type ExploreChip = { label: string; icon: LucideIcon; category?: string; path?: string };

// Times can arrive as "12:00 – 23:30", "Reception 24 hours" or plain text -
// this pulls out either an explicit range or the "always open" case.
function parseHoursRange(hours: string): { start: number; end: number } | 'always' | null {
  const lower = hours.toLowerCase();
  if (lower.includes('24 hour') || lower.includes('24/7')) return 'always';
  const match = hours.match(/(\d{1,2}):(\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  return { start, end };
}

function isOpenNow(hours: string, nowMinutes: number): boolean {
  const range = parseHoursRange(hours);
  if (range === 'always') return true;
  if (!range) return false;
  const { start, end } = range;
  // Handles ranges that cross midnight (e.g. 20:00 - 02:00).
  if (start <= end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());

  const exploreChips: ExploreChip[] = [
    { label: 'Restaurants', icon: Utensils, category: 'Restaurants' },
    { label: 'Cafes', icon: Coffee, category: 'Cafes' },
    { label: 'Hotels', icon: BedDouble, category: 'Hotels' },
    { label: t('beach'), icon: Waves, path: '/nature' },
  ];

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: fetchListings,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const lebanonTime = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Beirut', hour: '2-digit', minute: '2-digit' }).format(now),
    [now],
  );

  const lebanonMinutes = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Beirut',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
    return hour * 60 + minute;
  }, [now]);

  const bestRated = useMemo(
    () => [...listings]
      .filter((item) => item.avgRating != null)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
      .slice(0, 5),
    [listings],
  );

  const openNow = useMemo(
    () => listings.filter((item) => isOpenNow(item.hours, lebanonMinutes)).slice(0, 6),
    [listings, lebanonMinutes],
  );

  if (!open) return null;

  const goToCategory = (category: string) => {
    onClose();
    setLocation(`/browse?category=${encodeURIComponent(category)}`);
  };

  const handleChip = (chip: ExploreChip) => {
    onClose();
    if (chip.path) {
      setLocation(chip.path);
    } else if (chip.category) {
      setLocation(`/browse?category=${encodeURIComponent(chip.category)}`);
    }
  };

  const submitSearch = () => {
    const value = query.trim();
    onClose();
    setLocation(value ? `/browse?q=${encodeURIComponent(value)}` : '/browse');
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#f9f0df]" data-testid="overlay-search">
      <div className="mx-auto max-w-[720px] px-5 py-8 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#183c44] transition hover:bg-[#183c44]/10"
            aria-label={t('closeSearch')}
            data-testid="button-close-search"
          >
            <X className="h-5 w-5" />
          </button>
          <form
            onSubmit={(event) => { event.preventDefault(); submitSearch(); }}
            className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm"
          >
            <Search className="h-4 w-4 shrink-0 text-[#183c44]/55" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('heroSearch')}
              className="min-w-0 flex-1 bg-transparent text-sm text-[#183c44] outline-none placeholder:text-[#183c44]/45"
              aria-label={t('search')}
              data-testid="input-overlay-search"
            />
          </form>
        </div>

        <div className="mt-8">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#476269]">{t('exploreTitle')}</p>
          <div className="flex flex-wrap gap-2.5">
            {exploreChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChip(chip)}
                className="flex items-center gap-2 rounded-full border border-[#183c44]/15 bg-white px-4 py-2 text-xs font-semibold text-[#183c44] transition hover:border-[#e58c70] hover:text-[#e58c70]"
                data-testid={`chip-search-${chip.label.toLowerCase()}`}
              >
                <chip.icon className="h-3.5 w-3.5" /> {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#476269]">
            <Star className="h-3.5 w-3.5 text-[#e58c70]" /> {t('bestRatedTitle')}
          </div>
          {bestRated.length === 0 ? (
            <p className="text-sm text-[#476269]">{t('noRatingYet')}</p>
          ) : (
            <ul className="divide-y divide-[#183c44]/10 overflow-hidden rounded-2xl bg-white shadow-sm">
              {bestRated.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goToCategory(item.category)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f9f0df]"
                    data-testid={`row-best-rated-${item.id}`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-[#183c44]">{item.name}</span>
                      <span className="block text-xs text-[#476269]">{item.category}{item.area ? ` \u00b7 ${item.area}` : ''}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-[#183c44]">
                      <Star className="h-3.5 w-3.5 fill-[#f1c575] text-[#f1c575]" /> {item.avgRating?.toFixed(1)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-8 mt-10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#476269]">
              <Clock3 className="h-3.5 w-3.5 text-[#e58c70]" /> {t('openNowTitle')}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]" data-testid="text-overlay-lebanon-time">
              {lebanonTime} · Lebanon time
            </span>
          </div>
          {openNow.length === 0 ? (
            <p className="text-sm text-[#476269]">{t('noOpenPlaces')}</p>
          ) : (
            <ul className="divide-y divide-[#183c44]/10 overflow-hidden rounded-2xl bg-white shadow-sm">
              {openNow.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goToCategory(item.category)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f9f0df]"
                    data-testid={`row-open-now-${item.id}`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-[#183c44]">{item.name}</span>
                      <span className="block text-xs text-[#476269]">{item.category}{item.area ? ` \u00b7 ${item.area}` : ''}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#2f7a4d]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2f7a4d]" /> {item.hours}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
