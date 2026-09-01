import { useEffect, useMemo, useState } from 'react';
import { SiteNavbar } from '@/components/site-navbar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  FileText,
  Globe,
  Instagram,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { AppMark } from '@/App';
import { StarRating } from '@/components/star-rating';
import { ImageLightbox } from '@/components/image-lightbox';
import { useTranslation } from '@/lib/language';
import {
  apiUrlFor,
  directionsUrlFor,
  fetchListingGallery,
  fetchListings,
  fetchRating,
  fetchSaved,
  imageUrlFor,
  isLoggedIn,
  listingGalleryImageUrlFor,
  logoUrlFor,
  menuUrlFor,
  resolveImageSrc,
  saveListing,
  submitRating,
  unsaveListing,
  type ApiListing,
} from '@/lib/api';

type Category = 'All' | ApiListing['category'];
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

export default function BrowsePage() {
  const { tr } = useTranslation();
  const rawSearch = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);

  const [activeCategory, setActiveCategory] = useState<Category>((params.get('category') as Category) || 'All');
  const [search, setSearch] = useState(params.get('q') || '');
  const [selected, setSelected] = useState<ApiListing | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const loggedIn = isLoggedIn();

  useEffect(() => {
    setActiveCategory((params.get('category') as Category) || 'All');
    setSearch(params.get('q') || '');
  }, [params]);

  const queryClient = useQueryClient();

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['listings'],
    queryFn: fetchListings,
  });
  const { data: categoryRecords = [] } = useQuery({
  queryKey: ['categories'],
  queryFn: fetchCategories,
});

const availableCategories = [
  'All',
  ...categoryRecords.map((category) => category.name),
] as Category[];

  const { data: savedListings = [] } = useQuery({
    queryKey: ['saved'],
    queryFn: fetchSaved,
    enabled: loggedIn,
  });
  const saved = savedListings.map((item) => item.id);

  const saveMutation = useMutation({
    mutationFn: (listing: ApiListing) =>
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

  const requireLogin = () => setLocation(`/login?next=${encodeURIComponent('/browse' + (rawSearch ? '?' + rawSearch : ''))}`);

  const toggleSaved = (listing: ApiListing) => {
    if (!loggedIn) return requireLogin();
    saveMutation.mutate(listing);
  };

  const { data: ratingInfo } = useQuery({
    queryKey: ['rating', selected?.id],
    queryFn: () => fetchRating(selected!.id),
    enabled: !!selected,
  });

  const { data: extraPhotos = [] } = useQuery({
    queryKey: ['listing-gallery', selected?.id],
    queryFn: () => fetchListingGallery(selected!.id),
    enabled: !!selected,
  });

  const rateMutation = useMutation({
    mutationFn: (stars: number) => submitRating(selected!.id, stars),
    onSuccess: (data) => {
      queryClient.setQueryData(['rating', selected?.id], data);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
  });

  const rateSelected = (stars: number) => {
    if (!loggedIn) return requireLogin();
    rateMutation.mutate(stars);
  };

 const filteredListings = listings.filter((listing) => {
  const matchesCategory =
    activeCategory === 'All' || listing.category === activeCategory;

  const searchableText = [
    listing.name,
    listing.category,
    listing.area,
    listing.description,
    listing.tag,
    listing.hours,
    listing.price,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const searchTerms = search
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const matchesSearch =
    searchTerms.length === 0 ||
    searchTerms.every((term) => searchableText.includes(term));

  return matchesCategory && matchesSearch;
});

  return (
    <div className="noise min-h-[100dvh] bg-[#e9dfcd]">
      <SiteNavbar />

      <main className="mx-auto max-w-[1280px] px-5 pb-14 pt-28 lg:px-10 lg:pb-20 lg:pt-32">
        <p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]">{tr('Browse the city', 'اكتشف المدينة', 'Explorer la ville')}</p>
        <h1 className="font-display text-5xl leading-[.94] tracking-[-.04em] text-[#183c44] sm:text-6xl">{tr('Find your Spot.', 'اعثر على مكانك.', 'Trouvez votre endroit.')}</h1>
        <p className="mt-5 max-w-[400px] text-sm leading-6 text-[#476269]">{tr('Search by name, neighbourhood, or the feeling you are after.', 'ابحث بالاسم أو الحي أو التجربة التي تريدها.', 'Recherchez par nom, quartier ou ambiance.')}</p>

        <div className="mt-9 flex flex-col gap-3 lg:flex-row">
          <div className="flex flex-1 items-center rounded-xl border border-[#cfc0aa] bg-[#f9f0df] px-4">
            <Search className="h-4 w-4 text-[#e58c70]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr('Search food, stays, services...', 'ابحث عن الطعام والإقامة والخدمات...', 'Rechercher restaurants, séjours, services...')} className="w-full bg-transparent px-3 py-3.5 text-sm text-[#183c44] outline-none placeholder:text-[#476269]/55" aria-label={tr('Search all listings', 'البحث في كل الأماكن', 'Rechercher tous les lieux')} data-testid="input-listing-search" />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search" className="p-1 text-[#476269]" data-testid="button-clear-search"><X className="h-4 w-4" /></button>}
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {availableCategories.map((category) => (
            <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[.1em] transition ${activeCategory === category ? 'border-[#183c44] bg-[#183c44] text-[#f9f0df]' : 'border-[#cfc0aa] bg-transparent text-[#476269] hover:border-[#183c44] hover:text-[#183c44]'}`} data-testid={`button-filter-${category.toLowerCase().replaceAll(' ', '-')}`}>{category}</button>
          ))}
        </div>

        {isLoading && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-listings-loading">
            <p className="font-display text-3xl text-[#183c44]">{tr('Loading the guide...', 'جار تحميل الدليل...', 'Chargement du guide...')}</p>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">{tr('Fetching the latest places from the database.', 'جاري جلب أحدث الأماكن من قاعدة البيانات.', 'Recuperation des derniers lieux de la base de donnees.')}</p>
          </div>
        )}
        {isError && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-listings-error">
            <p className="font-display text-3xl text-[#183c44]">{tr('Couldn\'t reach the API.', 'لا يمكن الوصول إلى الخادم.', 'Impossible de joindre l\'API.')}</p>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">{tr('Make sure the backend server in /server is running and VITE_API_URL points to it.', 'تأكد من تشغيل خادم الواجهة الخلفية في /server وأن VITE_API_URL يشير إليه.', 'Assurez-vous que le serveur backend dans /server est en cours d\'execution et que VITE_API_URL pointe vers lui.')}</p>
          </div>
        )}
        {!isLoading && !isError && (
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => {
              const isSaved = saved.includes(listing.id);
              return (
                <article key={listing.id} className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-[#d7c9b4] bg-[#f9f0df] transition duration-300 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-listing-${listing.id}`}>
                  {resolveImageSrc(listing, imageUrlFor(listing.id)) && <div className="h-32 overflow-hidden"><img src={resolveImageSrc(listing, imageUrlFor(listing.id))!} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-[#e58c70]">{listing.category}</p>
                        <button onClick={() => setSelected(listing)} className="mt-1 text-left font-display text-3xl leading-none text-[#183c44] hover:text-[#e58c70]" data-testid={`button-open-${listing.id}`}>{listing.name}</button>
                      </div>
                      <button onClick={() => toggleSaved(listing)} aria-label={`${isSaved ? 'Remove' : 'Save'} ${listing.name}`} className={`rounded-full border p-2 transition ${isSaved ? 'border-[#e58c70] bg-[#e58c70] text-[#fff8ed]' : 'border-[#d7c9b4] text-[#476269] hover:border-[#e58c70] hover:text-[#e58c70]'}`} data-testid={`button-save-${listing.id}`}>
                        {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#476269]">{listing.description}</p>
                    {listing.avgRating != null && (
                      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#476269]" data-testid={`text-community-rating-${listing.id}`}>
                        <StarRating value={Math.round(listing.avgRating)} size="sm" />
                        {listing.avgRating} ({listing.ratingCount})
                      </p>
                    )}
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5 text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]/75">
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#e58c70]" /> {listing.area}</span>
                      <span className="text-[#183c44]">{listing.rating} <span className="text-[#e58c70]">·</span> {listing.price}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!isLoading && !isError && filteredListings.length === 0 && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="empty-search-results">
            <Search className="mx-auto h-7 w-7 text-[#e58c70]" />
            <h3 className="mt-5 font-display text-3xl text-[#183c44]">{tr('That trail is quiet for now.', 'هذا الطريق هادئ الآن.', 'Ce sentier est calme pour le moment.')}</h3>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">{tr('Try a broader search, or let us take you back to the full local edit.', 'جرب بحثا أوسع، أو دعنا نعيدك إلى الدليل المحلي الكامل.', 'Essayez une recherche plus large, ou laissez-nous vous ramener au guide local complet.')}</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All'); setLocation('/browse'); }} className="mt-6 rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a]" data-testid="button-reset-search">{tr('Show all places', 'عرض جميع الأماكن', 'Afficher tous les lieux')}</button>
          </div>
        )}
        <p className="mt-6 font-mono-custom text-[10px] uppercase tracking-[.13em] text-[#476269]/70" data-testid="text-results-count">{filteredListings.length} {tr('places in the guide · curated for real life', 'أماكن في الدليل · منسقة للحياة الحقيقية', 'lieux dans le guide · choisis pour la vraie vie')}</p>
      </main>

      {saveNotice && <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#183c44] px-4 py-3 text-xs font-semibold text-[#f9f0df] shadow-xl" role="status" data-testid="status-save-notice"><BookmarkCheck className="h-4 w-4 text-[#f1c575]" /> {saveNotice}</div>}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#183c44]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`${selected.name} details`} data-testid="dialog-listing-details">
          <div className="relative max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-[#f9f0df] p-6 text-[#183c44] shadow-2xl sm:rounded-3xl sm:p-8">
            <button onClick={() => setSelected(null)} className="absolute right-5 top-5 rounded-full border border-[#d7c9b4] p-2 text-[#476269] hover:text-[#e58c70]" aria-label="Close details" data-testid="button-close-details"><X className="h-4 w-4" /></button>
            {resolveImageSrc(selected, imageUrlFor(selected.id)) && <img src={resolveImageSrc(selected, imageUrlFor(selected.id))!} alt="" className="mb-6 h-44 w-full rounded-2xl object-cover" />}
            {extraPhotos.length > 0 && (
              <div className="mb-6 grid grid-cols-3 gap-2">
                {extraPhotos.map((photo) => {
                  const src = resolveImageSrc(photo, listingGalleryImageUrlFor(selected.id, photo.position));
                  if (!src) return null;
                  return (
                    <button
                      key={photo.position}
                      onClick={() => setLightboxSrc(src)}
                      className="group relative h-20 w-full overflow-hidden rounded-xl"
                      data-testid={`button-view-photo-${photo.position}`}
                    >
                      <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-[#183c44]/0 text-[10px] font-bold uppercase tracking-[.08em] text-transparent transition group-hover:bg-[#183c44]/50 group-hover:text-[#f9f0df]">
                        Tap to view
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3">
              {resolveImageSrc({ hasImage: selected.hasLogo, imageUrl: selected.logoUrl }, logoUrlFor(selected.id)) && (
                <img src={resolveImageSrc({ hasImage: selected.hasLogo, imageUrl: selected.logoUrl }, logoUrlFor(selected.id))!} alt="" className="h-10 w-10 rounded-full border border-[#d7c9b4] bg-white object-contain p-1" />
              )}
              <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#e58c70]">{selected.category} · {selected.tag}</p>
            </div>
            <h2 className="mt-2 pr-8 font-display text-5xl leading-[.9]">{selected.name}</h2>
            <p className="mt-5 text-sm leading-6 text-[#476269]">{selected.description}</p>
            {(selected.instagramUrl || selected.websiteUrl || ((selected.category === 'Restaurants' || selected.category === 'Cafes') && (selected.hasMenu || selected.menuUrl))) && (
              <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#183c44]">
                {selected.instagramUrl && (
                  <a href={selected.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#e58c70]" data-testid="link-instagram"><Instagram className="h-3.5 w-3.5" /> {tr('Instagram', 'انستجرام', 'Instagram')}</a>
                )}
                {selected.websiteUrl && (
                  <a href={selected.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#e58c70]" data-testid="link-website"><Globe className="h-3.5 w-3.5" /> {tr('Website', 'الموقع الإلكتروني', 'Site web')}</a>
                )}
                {(selected.category === 'Restaurants' || selected.category === 'Cafes') && (selected.hasMenu || selected.menuUrl) && (
                  <a href={resolveImageSrc({ hasImage: selected.hasMenu, imageUrl: selected.menuUrl }, menuUrlFor(selected.id))!} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#e58c70]" data-testid="link-menu"><FileText className="h-3.5 w-3.5" /> {tr('View menu', 'عرض القائمة', 'Afficher le menu')}</a>
                )}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#e9dfcd] p-3" data-testid="widget-rate-place">
              <div>
                <p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">
                  {ratingInfo?.avgRating != null ? `${ratingInfo.avgRating} average · ${ratingInfo.ratingCount} rating${ratingInfo.ratingCount === 1 ? '' : 's'}` : tr('No community ratings yet', 'لا توجد تقييمات مجتمع حتى الآن', 'Pas encore d\'avis communautaire')}
                </p>
                <p className="mt-1 text-xs font-semibold">{loggedIn ? (ratingInfo?.yourRating ? tr('Your rating', 'تقييمك', 'Votre avis') : tr('Rate this place', 'قيم هذا المكان', 'Noter ce lieu')) : tr('Log in to rate this place', 'سجل الدخول لتقييم هذا المكان', 'Connectez-vous pour noter ce lieu')}</p>
              </div>
              <StarRating value={loggedIn ? ratingInfo?.yourRating ?? null : null} onRate={rateSelected} />
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Where', 'الموقع', 'Ou')}</p><p className="mt-1 font-semibold">{selected.area}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Hours', 'الساعات', 'Horaires')}</p><p className="mt-1 font-semibold">{selected.hours}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Local note', 'ملاحظة محلية', 'Note locale')}</p><p className="mt-1 font-semibold">{selected.rating} rating · {selected.price}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Call', 'اتصل', 'Appeler')}</p><p className="mt-1 font-semibold">{selected.phone}</p></div>
            </div>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <a href={directionsUrlFor(selected)} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#183c44] px-4 py-3.5 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] hover:bg-[#24515a]" data-testid="link-get-directions"><MapPin className="h-4 w-4 text-[#f1c575]" /> {tr('Get directions', 'احصل على الاتجاهات', 'Obtenir l\'itineraire')} <ExternalLink className="h-3.5 w-3.5 opacity-60" /></a>
              <button onClick={() => toggleSaved(selected)} className="flex items-center justify-center gap-2 rounded-xl border border-[#cfc0aa] px-4 py-3.5 text-xs font-bold uppercase tracking-[.12em] text-[#183c44] hover:border-[#e58c70]" data-testid="button-save-details">{saved.includes(selected.id) ? <BookmarkCheck className="h-4 w-4 text-[#e58c70]" /> : <Bookmark className="h-4 w-4" />} {saved.includes(selected.id) ? tr('Saved', 'محفوظة', 'Enregistre') : tr('Save spot', 'احفظ المكان', 'Enregistrer ce lieu')}</button>
            </div>
          </div>
        </div>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
