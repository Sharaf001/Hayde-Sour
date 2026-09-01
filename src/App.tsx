import { useEffect, useMemo, useState } from 'react';
import { SiteNavbar } from '@/components/site-navbar';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrlFor, directionsUrlFor, fetchGallery, fetchListings, fetchSaved, galleryImageUrlFor, getCurrentUser, imageUrlFor, isLoggedIn, resolveImageSrc, saveListing, unsaveListing } from '@/lib/api';
import { ErrorBoundary } from '@/components/error-boundary';
import { LanguageProvider, useTranslation } from '@/lib/language';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import AdminPage from '@/pages/admin';
import BrowsePage from '@/pages/browse';
import SavedPage from '@/pages/saved';
import LoginPage from '@/pages/login';
import AccountPage from '@/pages/account';
import NaturePage from '@/pages/nature';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Bookmark,
  BookmarkCheck,
  BusFront,
  CalendarDays,
  Clock3,
  Coffee,
  Cross,
  ExternalLink,
  HeartPulse,
  HousePlug,
  Leaf,
  Map,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  Utensils,
  Wifi,
  X,
} from 'lucide-react';

const queryClient = new QueryClient();

type Category = string;
type CategoryCard = {
  label: string;
  detail: string;
  icon: LucideIcon;
  color: string;
};
type Listing = Awaited<ReturnType<typeof fetchListings>>[number];

export const categories: CategoryCard[] = [
  { label: 'Restaurants', detail: 'Long lunches, sea catch & mezze', icon: Utensils, color: 'bg-[#f1c575]' },
  { label: 'Cafes', detail: 'Morning coffee, slow afternoons', icon: Coffee, color: 'bg-[#e58c70]' },
  { label: 'Hotels', detail: 'A room close to the water', icon: BedDouble, color: 'bg-[#9fc7bf]' },
  { label: 'Pharmacies', detail: 'The useful things, nearby', icon: Cross, color: 'bg-[#d9b6a1]' },
  { label: 'Hospitals', detail: 'Care when it matters', icon: HeartPulse, color: 'bg-[#b7c8c0]' },
  { label: 'Shops', detail: 'Souk finds & daily errands', icon: ShoppingBag, color: 'bg-[#e7ba8a]' },
  { label: 'Home appliances', detail: 'For homes, kitchens & more', icon: HousePlug, color: 'bg-[#aebfc9]' },
  { label: 'Where to go nature', detail: 'Coastline, hills & open air', icon: Leaf, color: 'bg-[#a8c3a0]' },
];

// Listings now live in Postgres and are served by the API in /server.
// See src/lib/api.ts for the fetch/save helpers.

// Each time slot has a few options; one is picked per slot using a seed
// based on today's date, so the plan is the same for everyone all day
// but changes automatically tomorrow.
const planPools = [
  {
    time: '07:45',
    icon: Coffee,
    options: [
      { title: 'Coffee before the heat', detail: 'Start at Dar Alma. Order Turkish coffee and something with rosewater.' },
      { title: 'Coffee by the water', detail: 'Grab a seat at Mina Social Club and watch the boats come in.' },
      { title: 'A quiet start', detail: 'Find any corner cafe in the old city and let the morning move slowly.' },
    ],
  },
  {
    time: '10:15',
    icon: Map,
    options: [
      { title: 'Walk the old stones', detail: 'Follow the sea wall past the Roman columns and down to Al Mina.' },
      { title: 'Wander the souk', detail: 'Get pleasantly lost in the covered market streets near the old city.' },
      { title: 'Trace the harbour', detail: 'Follow the fishing harbour round to where the old city meets the sea.' },
    ],
  },
  {
    time: '13:00',
    icon: Utensils,
    options: [
      { title: 'Lunch on the water', detail: 'Al Fanar for grilled catch, cold arak and a table facing the harbour.' },
      { title: 'A long Lebanese lunch', detail: 'Le Phenicien for a generous spread with the sound of the waves below.' },
      { title: 'Something simple', detail: 'A shaded table near the souk, whatever looks freshest that day.' },
    ],
  },
  {
    time: '17:40',
    icon: Sparkles,
    options: [
      { title: 'Golden hour, properly', detail: 'Cross to the fishing harbour. The light catches the castle first.' },
      { title: 'Sunset from the ruins', detail: 'Sit near the old columns as the sky turns gold over the sea.' },
      { title: 'One last coffee', detail: 'End the day back at the marina with something cold in hand.' },
    ],
  },
];

function seededIndex(seed: string, length: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % length;
}

function buildTodaysPlan(dateStr: string) {
  return planPools.map((slot, slotIndex) => {
    const option = slot.options[seededIndex(`${dateStr}-${slotIndex}`, slot.options.length)];
    return { time: slot.time, icon: slot.icon, ...option };
  });
}

function buildDayPlanICS(planItems: ReturnType<typeof buildTodaysPlan>, dateStr: string) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const compactDate = dateStr.replaceAll('-', '');
  const events = planItems.map((item, i) => {
    const [hh, mm] = item.time.split(':').map(Number);
    const start = `${compactDate}T${pad(hh)}${pad(mm)}00`;
    const endDate = new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:00`);
    endDate.setHours(endDate.getHours() + 1);
    const end = `${compactDate}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
    return [
      'BEGIN:VEVENT',
      `UID:sour-day-plan-${dateStr}-${i}@wheretogosour`,
      `DTSTAMP:${compactDate}T000000Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${item.title}`,
      `DESCRIPTION:${item.detail.replaceAll(',', '\\,')}`,
      'END:VEVENT',
    ].join('\r\n');
  }).join('\r\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Where To Go Sour//Day Plan//EN', 'CALSCALE:GREGORIAN', events, 'END:VCALENDAR'].join('\r\n');
}

export function AppMark() {
  return (
    <div className="flex h-10 items-center overflow-visible sm:h-12" data-testid="brand-mark">
      <img
        src={`${import.meta.env.BASE_URL}hydesour1.png`}
        alt="Where To Go Sour"
        className="h-14 w-auto max-w-[180px] object-contain sm:h-[6rem] sm:max-w-[290px]"
        onError={(event) => {
          console.error('Could not load logo:', event.currentTarget.src);
        }}
      />
    </div>
  );
}

type ApiCategory = {
  id: string;
  name: string;
};

async function fetchCategories(): Promise<ApiCategory[]> {
  const response = await fetch(apiUrlFor('/api/categories'));

  if (!response.ok) {
    throw new Error('Could not load categories.');
  }

  return response.json();
}

function Home() {
  const [, setLocation] = useLocation();
  const { t, tr } = useTranslation();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const queryClient = useQueryClient();
  const loggedIn = isLoggedIn();
  const currentUser = getCurrentUser();

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: fetchListings,
  });
  
  const {
  data: categoryRecords = [],
  isLoading: categoriesLoading,
} = useQuery({
  queryKey: ['categories'],
  queryFn: fetchCategories,
});

const categoryCards: CategoryCard[] = categoryRecords.map((record) => {
  const configuredCategory = categories.find(
    (category) => category.label === record.name,
  );

  return configuredCategory ?? {
    label: record.name,
    detail: 'Discover places around Sour',
    icon: Store,
    color: 'bg-[#b7c8c0]',
  };
});

  const { data: savedListings = [] } = useQuery({
    queryKey: ['saved'],
    queryFn: fetchSaved,
    enabled: loggedIn,
  });
  const saved = savedListings.map((item) => item.id);

  const saveMutation = useMutation({
    mutationFn: (listing: Listing) =>
      saved.includes(listing.id)
        ? unsaveListing(listing.id).then(() => ({ saved: false }))
        : saveListing(listing.id),
    onSuccess: (_data, listing) => {
      const wasSaved = saved.includes(listing.id);
      setSaveNotice(wasSaved ? `${listing.name} removed from your saved spots` : `${listing.name} saved for later`);
      window.setTimeout(() => setSaveNotice(''), 2400);
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
  });

  const toggleSaved = (listing: Listing) => {
    if (!loggedIn) {
      setLocation('/login?next=/');
      return;
    }
    saveMutation.mutate(listing);
  };

 
  const { data: featuredItems = [] } = useQuery({
    queryKey: ['gallery', 'featured'],
    queryFn: () => fetchGallery('featured'),
  });
  const featuredListings = featuredItems.slice(0, 3);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const plan = useMemo(() => buildTodaysPlan(todayStr), [todayStr]);
  const dayName = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), []);

  const saveDayToCalendar = () => {
    const ics = buildDayPlanICS(plan, todayStr);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sour-day-plan-${todayStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const chooseCategory = (category: Category) => {
    if (category === 'Where to go nature') {
      setLocation('/nature');
      return;
    }
    setLocation(category === 'All' ? '/browse' : `/browse?category=${encodeURIComponent(category)}`);
  };

  const goSearch = () => {
    setLocation(search.trim() ? `/browse?q=${encodeURIComponent(search.trim())}` : '/browse');
  };

  return (
    <div className="noise min-h-[100dvh] overflow-x-hidden">
    <SiteNavbar />

      <main id="top" >
        <section className="relative min-h-[740px] overflow-hidden bg-[#183c44] text-[#f9f0df] lg:min-h-[775px]">
          <img src="/tyre-hero.webp" alt="Tyre coastline and old sea castle at golden hour" decoding="sync" className="absolute inset-0 h-full w-full object-cover opacity-55" data-testid="img-hero-tyre" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,60,68,.98)_0%,rgba(24,60,68,.72)_37%,rgba(24,60,68,.22)_77%,rgba(24,60,68,.54)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#183c44] to-transparent" />
          <div className="relative mx-auto flex min-h-[740px] max-w-[1280px] items-end px-5 pb-24 pt-36 lg:min-h-[775px] lg:px-10 lg:pb-28">
            <div className="max-w-[800px]">
              <div className="reveal mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#f1c575]">
                <span className="h-px w-8 bg-[#f1c575]" /> {t('heroLocation')}
              </div>
              <h1 className="reveal reveal-delay-1 max-w-[790px] font-display text-[clamp(4rem,9.5vw,8.7rem)] leading-[.81] tracking-[-.055em] text-balance">
                {t('heroLineOne')}<br /><em className="font-normal text-[#f1c575]">{t('heroLineTwo')}</em><br />{t('heroLineThree')}
              </h1>
              <p className="reveal reveal-delay-2 mt-8 max-w-[490px] text-[15px] leading-7 text-[#f9f0df]/76">
                {t('heroText')}
              </p>
              <form onSubmit={(event) => { event.preventDefault(); goSearch(); }} className="reveal reveal-delay-3 mt-9 flex max-w-[600px] items-center rounded-2xl bg-[#f9f0df] p-1.5 shadow-2xl" data-testid="form-hero-search">
                <Search className="ml-3 h-5 w-5 shrink-0 text-[#183c44]/55" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('heroSearch')} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#183c44] outline-none placeholder:text-[#183c44]/45" aria-label={t('search')} data-testid="input-hero-search" />
                <button type="submit" className="rounded-xl bg-[#e58c70] px-5 py-3 text-xs font-bold uppercase tracking-[.13em] text-[#fff8ed] transition hover:bg-[#d67558]" data-testid="button-hero-search">{t('search')}</button>
              </form>
              <div className="reveal reveal-delay-3 mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#f9f0df]/60">
                <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-[#f1c575]" /> 22° · light sea breeze</span>
                <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#f1c575]" /> 33.27° N, 35.20° E</span>
                 <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[#f1c575]" />
  Supported by Sawt Al Farah
  </span>
              </div>
            </div>
            
          </div>
        </section>

        

        <section className="bg-[#e9dfcd] py-20 lg:py-28">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-5 lg:grid-cols-[.75fr_1.25fr] lg:px-10">
            <div className="flex flex-col justify-between">
              <div>
                <p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]">{t('featuredLabel')}</p>
                <h2 className="max-w-[430px] font-display text-5xl leading-[.94] tracking-[-.04em] text-[#183c44] sm:text-6xl">{t('featuredTitle')}</h2>
                <p className="mt-6 max-w-[350px] text-sm leading-6 text-[#476269]">{t('featuredText')}</p>
              </div>
              <a href="/nature" className="mt-10 flex w-fit items-center gap-3 border-b border-[#183c44] pb-2 text-xs font-bold uppercase tracking-[.15em] text-[#183c44] transition hover:gap-5" data-testid="button-see-all-spots">{t('seeAll')} <ArrowRight className="h-4 w-4" /></a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredListings.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#c9bba5] p-6 text-sm text-[#476269] sm:col-span-2 lg:col-span-4">
                  
                </div>
              )}
              {featuredListings[0] && (
                <button onClick={() => setLocation('/nature')} className="group relative min-h-[390px] overflow-hidden rounded-2xl text-left sm:row-span-2" data-testid={`card-featured-${featuredListings[0].id}`}>
                  <img src={resolveImageSrc(featuredListings[0], galleryImageUrlFor(featuredListings[0].id)) || '/tyre-hero.jpg'} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#183c44] via-[#183c44]/15 to-transparent" />
                  <div className="absolute bottom-0 p-6 text-[#f9f0df]">
                    <p className="font-display text-4xl leading-none">{featuredListings[0].name}</p>
                    <p className="mt-2 text-xs text-[#f9f0df]/70">{featuredListings[0].location}</p>
                  </div>
                </button>
              )}
              {featuredListings[1] && (
                <button onClick={() => setLocation('/nature')} className="group relative min-h-[188px] overflow-hidden rounded-2xl text-left" data-testid={`card-featured-${featuredListings[1].id}`}>
                  <img src={resolveImageSrc(featuredListings[1], galleryImageUrlFor(featuredListings[1].id)) || '/tyre-cafe.jpg'} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#183c44]/90 to-transparent" />
                  <div className="absolute bottom-5 left-5 text-[#f9f0df]">
                    <p className="font-display text-3xl leading-none">{featuredListings[1].name}</p>
                    <p className="mt-1 text-[11px] text-[#f9f0df]/70">{featuredListings[1].location}</p>
                  </div>
                </button>
              )}
              {featuredListings[2] && (
                <button onClick={() => setLocation('/nature')} className="group relative min-h-[188px] overflow-hidden rounded-2xl bg-[#183c44] p-5 text-left text-[#f9f0df] transition hover:bg-[#214c55]" data-testid={`card-featured-${featuredListings[2].id}`}>
                  <div className="flex items-start justify-between"><Store className="h-5 w-5 text-[#f1c575]" /><ArrowUpRight className="h-4 w-4 text-[#f9f0df]/50" /></div>
                  <p className="mt-10 font-display text-3xl leading-none">{featuredListings[2].name}</p>
                  <p className="mt-2 max-w-[190px] text-[11px] leading-4 text-[#f9f0df]/65">{featuredListings[2].location}</p>
                </button>
              )}
            </div>
          </div>
        </section>

<div className="border-b border-[#d7c9b4] bg-[#f1c575] text-[#183c44]">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-5 overflow-hidden px-5 py-4 lg:px-10">
            <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[.18em]">{t('localShortcut')}</p>
            <div className="hidden h-px flex-1 bg-[#183c44]/20 sm:block" />
            <p className="whitespace-nowrap text-[12px] font-medium">{t('localShortcutText')}</p>
            <ArrowDownRight className="h-4 w-4 shrink-0" />
          </div>
        </div>

        <section className="mx-auto max-w-[1280px] px-5 py-20 lg:px-10 lg:py-28" id="categories">
          <div className="mb-10 flex items-end justify-between gap-5">
            <div>
              <p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]">{t('categoriesLabel')}</p>
              <h2 className="max-w-[520px] font-display text-5xl leading-[.94] tracking-[-.04em] sm:text-6xl">{t('categoriesTitle')}</h2>
            </div>
            <div className="hidden flex-col items-end gap-4 sm:flex">
              
              <a href="/browse" className="flex items-center gap-2 rounded-full border border-[#183c44] px-4 py-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#183c44] transition hover:bg-[#183c44] hover:text-[#f9f0df]" data-testid="link-all-categories">{t('allCategories')} <ArrowRight className="h-3.5 w-3.5" /></a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoriesLoading ? (
              <div className="rounded-2xl border border-dashed border-[#c9bba5] p-5 text-sm text-[#476269] sm:col-span-2 lg:col-span-4">
                {t('loadingCategories')}
              </div>
            ) : categoryCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c9bba5] p-5 text-sm text-[#476269] sm:col-span-2 lg:col-span-4">
                {t('noCategories')}
              </div>
            ) : (
              categoryCards.map((category, index) => {
                const Icon = category.icon;

                return (
                  <button
                    key={category.label}
                    type="button"
                    onClick={() => chooseCategory(category.label)}
                    className={`group relative min-h-[178px] overflow-hidden rounded-2xl border border-[#d7c9b4] ${category.color} p-5 text-left transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      index === 0 ? 'lg:col-span-2' : ''
                    }`}
                    data-testid={`button-category-${category.label.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f9f0df]/65 text-[#183c44]">
                        <Icon className="h-5 w-5" strokeWidth={1.7} />
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-[#183c44]/65 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>

                    <div className="absolute bottom-5 left-5 right-5">
                      <p className="font-display text-3xl leading-none text-[#183c44]">
                        {category.label}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold text-[#183c44]/65">
                        {category.detail}
                      </p>
                    </div>
                  </button>
                );
              })
            )}

          
          </div>
        </section>

        <section id="day-plan" className="scroll-mt-5 bg-[#183c44] py-20 text-[#f9f0df] lg:py-28">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-5 lg:grid-cols-[.7fr_1.3fr] lg:px-10">
            <div>
              <p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#f1c575]">{t('dayLabel')} {dayName}</p>
              <h2 className="max-w-[440px] font-display text-5xl leading-[.94] tracking-[-.04em] sm:text-6xl">{t('dayTitle')}</h2>
              <p className="mt-6 max-w-[355px] text-sm leading-6 text-[#f9f0df]/65">{t('dayText')}</p>
              <button onClick={saveDayToCalendar} className="mt-9 flex items-center gap-3 rounded-full border border-[#f9f0df]/30 px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:border-[#f1c575] hover:text-[#f1c575]" data-testid="button-print-day-plan"><CalendarDays className="h-4 w-4" /> {t('saveDay')}</button>
            </div>
            <div className="divide-y divide-[#f9f0df]/15 border-t border-[#f9f0df]/20">
              {plan.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.time} className="grid gap-4 py-6 sm:grid-cols-[80px_38px_1fr] sm:items-start" data-testid={`plan-stop-${item.time}`}>
                    <p className="font-mono-custom text-xs text-[#f1c575]">{item.time}</p>
                    <Icon className="hidden h-5 w-5 text-[#e58c70] sm:block" strokeWidth={1.7} />
                    <div><h3 className="font-display text-3xl leading-none">{item.title}</h3><p className="mt-2 max-w-[430px] text-sm leading-6 text-[#f9f0df]/60">{item.detail}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="essentials" className="scroll-mt-5 mx-auto max-w-[1280px] px-5 py-20 lg:px-10 lg:py-28">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]">{t('goodToKnow')}</p><h2 className="font-display text-5xl leading-[.94] tracking-[-.04em] text-[#183c44] sm:text-6xl">{t('localContext')}</h2></div>
            <p className="max-w-[280px] text-sm leading-6 text-[#476269]">{t('localContextText')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-[#f1c575] p-6 text-[#183c44]"><BusFront className="h-5 w-5" /><p className="mt-12 font-display text-3xl leading-none">{t('getAround')}</p><p className="mt-3 text-xs leading-5 text-[#183c44]/70">{tr('Service taxis are the easiest hop. Ask for the white taxis.', 'سيارات الأجرة هي أسهل وسيلة للتنقل. اطلب سيارات الأجرة البيضاء.', 'Les taxis de service sont le moyen le plus simple. Demandez les taxis blancs.')}</p></div>
            <div className="rounded-2xl bg-[#e58c70] p-6 text-[#fff8ed]"><Wifi className="h-5 w-5" /><p className="mt-12 font-display text-3xl leading-none">{t('stayConnected')}</p><p className="mt-3 text-xs leading-5 text-[#fff8ed]/75">{tr('Most cafes have Wi-Fi. For a local SIM, ask at any phone shop.', 'تتوفر خدمة الواي فاي في معظم المقاهي. للحصول على شريحة محلية، اسأل في أي متجر هواتف.', 'La plupart des cafes ont le Wi-Fi. Pour une carte SIM locale, demandez dans une boutique de telephonie.')}</p></div>
            <div className="rounded-2xl bg-[#b7c8c0] p-6 text-[#183c44]"><Phone className="h-5 w-5" /><p className="mt-12 font-display text-3xl leading-none">{t('needHelp')}</p><p className="mt-3 text-xs leading-5 text-[#183c44]/70">{tr('For emergencies, call 140. Lebanese Red Cross', 'للطوارئ، اتصل على 140. الصليب الأحمر اللبناني', 'En cas d\'urgence, appelez le 140. Croix-Rouge libanaise')}</p></div>
            <div className="rounded-2xl bg-[#183c44] p-6 text-[#f9f0df]"><MapPin className="h-5 w-5 text-[#f1c575]" /><p className="mt-12 font-display text-3xl leading-none">{t('bestAddress')}</p><p className="mt-3 text-xs leading-5 text-[#f9f0df]/65">{tr('Old City by the sea. Start there and let the afternoon decide what comes next.', 'المدينة القديمة بجانب البحر. ابدأ من هناك ودع فترة بعد الظهر تقرر ما سيأتي.', 'La vieille ville au bord de la mer. Commencez la et laissez l\'apres-midi decider de la suite.')}</p></div>
          </div>
        </section>
      </main>

      <footer className="bg-[#e9dfcd]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-12 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <AppMark />
            <p className="mt-5 max-w-[330px] text-sm leading-6 text-[#476269]">
              {tr('A lovingly practical guide to Sour, made for curious visitors and the people who call it home.', 'دليل عملي ودافئ لصور، صُنع للزوار الفضوليين ولمن يسمونها وطناً.', 'Un guide pratique et soigne de Sour, pour les visiteurs curieux et celles et ceux qui y habitent.')}
            </p>
          </div>

          <div className="flex flex-col items-start gap-6 lg:items-end">
            <div className="text-left lg:text-right">
              <img
                src={`${import.meta.env.BASE_URL}Sawtalfarah.png`}
                alt="Sawt Al Farah"
                className="h-16 w-auto max-w-[220px] object-contain"
              />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#476269]">
                {t('supportedBy')}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-7 gap-y-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#476269]">
              <a href="#top" className="hover:text-[#e58c70]" data-testid="footer-link-top">{t('backToTop')}</a>
              <a href="/browse" className="hover:text-[#e58c70]" data-testid="footer-link-discover">{t('explorePlaces')}</a>
              <a href="/admin" className="hover:text-[#e58c70]" data-testid="footer-link-admin">Admin</a>
              <span className="font-mono-custom font-normal tracking-normal text-[#476269]/60">
                Made for Sour · 2026
              </span>
            </div>
          </div>
        </div>
      </footer>

      {saveNotice && <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#183c44] px-4 py-3 text-xs font-semibold text-[#f9f0df] shadow-xl" role="status" data-testid="status-save-notice"><BookmarkCheck className="h-4 w-4 text-[#f1c575]" /> {saveNotice}</div>}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#183c44]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`${selected.name} details`} data-testid="dialog-listing-details">
          <div className="relative max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-[#f9f0df] p-6 text-[#183c44] shadow-2xl sm:rounded-3xl sm:p-8">
            <button onClick={() => setSelected(null)} className="absolute right-5 top-5 rounded-full border border-[#d7c9b4] p-2 text-[#476269] hover:text-[#e58c70]" aria-label={tr('Close details', 'إغلاق التفاصيل', 'Fermer les details')} data-testid="button-close-details"><X className="h-4 w-4" /></button>
            {resolveImageSrc(selected, imageUrlFor(selected.id)) && <img src={resolveImageSrc(selected, imageUrlFor(selected.id))!} alt="" className="mb-6 h-44 w-full rounded-2xl object-cover" />}
            <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#e58c70]">{selected.category} · {selected.tag}</p>
            <h2 className="mt-2 pr-8 font-display text-5xl leading-[.9]">{selected.name}</h2>
            <p className="mt-5 text-sm leading-6 text-[#476269]">{selected.description}</p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{t('where')}</p><p className="mt-1 font-semibold">{selected.area}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{t('hours')}</p><p className="mt-1 font-semibold">{selected.hours}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{t('localNote')}</p><p className="mt-1 font-semibold">{selected.rating} {tr('rating', 'تقييم', 'avis')} · {selected.price}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{t('call')}</p><p className="mt-1 font-semibold">{selected.phone}</p></div>
            </div>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <a href={directionsUrlFor(selected)} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#183c44] px-4 py-3.5 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] hover:bg-[#24515a]" data-testid="link-get-directions"><MapPin className="h-4 w-4 text-[#f1c575]" /> {t('getDirections')} <ExternalLink className="h-3.5 w-3.5 opacity-60" /></a>
              <button onClick={() => toggleSaved(selected)} className="flex items-center justify-center gap-2 rounded-xl border border-[#cfc0aa] px-4 py-3.5 text-xs font-bold uppercase tracking-[.12em] text-[#183c44] hover:border-[#e58c70]" data-testid="button-save-details">{saved.includes(selected.id) ? <BookmarkCheck className="h-4 w-4 text-[#e58c70]" /> : <Bookmark className="h-4 w-4" />} {saved.includes(selected.id) ? t('saved') : t('saveSpot')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_METADATA: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Hayde Sour | هيدي صور',
    description: 'Discover cafes, restaurants, hotels, shops, nature, and local experiences in Tyre (Sour), Lebanon.',
  },
  '/browse': {
    title: 'Explore Places in Tyre | Hayde Sour',
    description: 'Browse handpicked restaurants, cafes, hotels, pharmacies, shops, and more in Tyre, Lebanon.',
  },
  '/saved': {
    title: 'Saved Places | Hayde Sour',
    description: 'View the places you saved for your next visit to Tyre, Lebanon.',
  },
  '/login': {
    title: 'Log In or Create an Account | Hayde Sour',
    description: 'Log in or create a Hayde Sour account to save places and share your ratings.',
  },
  '/account': {
    title: 'Your Account | Hayde Sour',
    description: 'Manage your Hayde Sour account details and Sour Card.',
  },
  '/nature': {
    title: 'Nature in Tyre | Hayde Sour',
    description: 'Explore beaches, coastline, and outdoor places to visit around Tyre, Lebanon.',
  },
  '/admin': {
    title: 'Admin | Hayde Sour',
    description: 'Manage Hayde Sour listings, categories, and local guides.',
  },
};

const NOT_FOUND_METADATA = {
  title: 'Page Not Found | Hayde Sour',
  description: 'The page you are looking for could not be found.',
};

function PageMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const metadata = PAGE_METADATA[location] || NOT_FOUND_METADATA;
    document.title = metadata.title;

    const descriptions = [
      ['meta[name="description"]', 'content'],
      ['meta[property="og:title"]', 'content', metadata.title],
      ['meta[property="og:description"]', 'content'],
      ['meta[name="twitter:title"]', 'content', metadata.title],
      ['meta[name="twitter:description"]', 'content'],
    ] as const;

    descriptions.forEach(([selector, attribute, value]) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) element.setAttribute(attribute, value || metadata.description);
    });
  }, [location]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <PageMetadata />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/browse" component={BrowsePage} />
        <Route path="/saved" component={SavedPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/nature" component={NaturePage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
