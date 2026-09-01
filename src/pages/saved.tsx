import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, FileText, Globe, Instagram, LogIn, MapPin, X } from 'lucide-react';
import { AppMark } from '@/App';
import { SiteNavbar } from '@/components/site-navbar';
import { StarRating } from '@/components/star-rating';
import { ImageLightbox } from '@/components/image-lightbox';
import { useTranslation } from '@/lib/language';
import {
  directionsUrlFor,
  fetchListingGallery,
  fetchRating,
  fetchSaved,
  imageUrlFor,
  isLoggedIn,
  listingGalleryImageUrlFor,
  logoUrlFor,
  menuUrlFor,
  resolveImageSrc,
  submitRating,
  unsaveListing,
  type ApiListing,
} from '@/lib/api';

export default function SavedPage() {
  const { tr } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ApiListing | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const loggedIn = isLoggedIn();

  const { data: savedListings = [], isLoading, isError } = useQuery({
    queryKey: ['saved'],
    queryFn: fetchSaved,
    enabled: loggedIn,
  });

  const unsaveMutation = useMutation({
    mutationFn: (listingId: string) => unsaveListing(listingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
  });

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
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
  });

  return (
    <div className="noise min-h-[100dvh] bg-[#e9dfcd]">
      <SiteNavbar />

      <main className="mx-auto max-w-[1280px] px-5 pb-14 pt-28 lg:px-10 lg:pb-20 lg:pt-32">
        <p className="mb-3 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]">{tr('Your list', 'قائمتك', 'Votre liste')}</p>
        <h1 className="font-display text-5xl leading-[.94] tracking-[-.04em] text-[#183c44] sm:text-6xl">{tr('Saved spots.', 'الأماكن المحفوظة.', 'Lieux enregistrés.')}</h1>
        <p className="mt-5 max-w-[430px] text-sm leading-6 text-[#476269]">{tr('Everything you have bookmarked while browsing Sour, kept here for next time.', 'كل ما حفظته أثناء تصفح صور محفوظ هنا للمرة القادمة.', 'Tout ce que vous avez mis en signet en parcourant Sour est conserve ici pour la prochaine fois.')}</p>

        {!loggedIn && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-saved-needs-login">
            <LogIn className="mx-auto h-7 w-7 text-[#e58c70]" />
            <h3 className="mt-5 font-display text-3xl text-[#183c44]">{tr('Log in to see your saved spots.', 'سجّل الدخول لرؤية أماكنك المحفوظة.', 'Connectez-vous pour voir vos lieux enregistrés.')}</h3>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">{tr('Your saved places are tied to your account so they follow you across devices.', 'أماكنك المحفوظة مرتبطة بحسابك لترافقك عبر الأجهزة.', 'Vos lieux enregistres sont lies a votre compte pour vous suivre sur tous vos appareils.')}</p>
            <a href={`/login?next=${encodeURIComponent('/saved')}`} className="mt-6 inline-block rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a]" data-testid="link-login-from-saved">{tr('Log in', 'سجّل الدخول', 'Connexion')}</a>
          </div>
        )}

        {loggedIn && isLoading && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-saved-loading">
            <p className="font-display text-3xl text-[#183c44]">{tr('Loading your saved spots...', 'جار تحميل أماكنك المحفوظة...', 'Chargement de vos lieux enregistrés...')}</p>
          </div>
        )}
        {loggedIn && isError && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-saved-error">
            <p className="font-display text-3xl text-[#183c44]">{tr('Couldn\'t reach the API.', 'لا يمكن الوصول إلى الخادم.', 'Impossible de joindre l\'API.')}</p>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">{tr('Make sure the backend server in /server is running.', 'تأكد من تشغيل خادم الواجهة الخلفية في /server.', 'Assurez-vous que le serveur backend dans /server est en cours d\'execution.')}</p>
          </div>
        )}
        {loggedIn && !isLoading && !isError && savedListings.length === 0 && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-saved-empty">
            <Bookmark className="mx-auto h-7 w-7 text-[#e58c70]" />
            <h3 className="mt-5 font-display text-3xl text-[#183c44]">{tr('Nothing saved yet.', 'لم تحفظ شيئا بعد.', 'Rien d\'enregistre pour le moment.')}</h3>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">{tr('Tap the bookmark icon on any place while browsing to keep it here.', 'انقر على أيقونة الحفظ في أي مكان أثناء التصفح للاحتفاظ به هنا.', 'Appuyez sur l\'icone de signet d\'un lieu pendant votre navigation pour le conserver ici.')}</p>
            <a href="/browse" className="mt-6 inline-block rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a]" data-testid="link-browse-from-empty">{tr('Browse places', 'استكشف الأماكن', 'Parcourir les lieux')}</a>
          </div>
        )}

        {loggedIn && !isLoading && !isError && savedListings.length > 0 && (
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedListings.map((listing) => {
              const src = resolveImageSrc(listing, imageUrlFor(listing.id));
              return (
                <article key={listing.id} className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-[#d7c9b4] bg-[#f9f0df] transition duration-300 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-saved-${listing.id}`}>
                  {src && <div className="h-32 overflow-hidden"><img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-[#e58c70]">{listing.category}</p>
                        <button onClick={() => setSelected(listing)} className="mt-1 text-left font-display text-3xl leading-none text-[#183c44] hover:text-[#e58c70]" data-testid={`button-open-saved-${listing.id}`}>{listing.name}</button>
                      </div>
                      <button onClick={() => unsaveMutation.mutate(listing.id)} aria-label={`${tr('Remove', 'إزالة', 'Supprimer')} ${listing.name}`} className="rounded-full border border-[#e58c70] bg-[#e58c70] p-2 text-[#fff8ed] transition hover:bg-[#d67558]" data-testid={`button-unsave-${listing.id}`}>
                        <BookmarkCheck className="h-4 w-4" />
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
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#183c44]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`${selected.name} details`} data-testid="dialog-saved-details">
          <div className="relative max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-[#f9f0df] p-6 text-[#183c44] shadow-2xl sm:rounded-3xl sm:p-8">
            <button onClick={() => setSelected(null)} className="absolute right-5 top-5 rounded-full border border-[#d7c9b4] p-2 text-[#476269] hover:text-[#e58c70]" aria-label="Close details" data-testid="button-close-saved-details"><X className="h-4 w-4" /></button>
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
                        {tr('Tap to view', 'انقر للعرض', 'Appuyez pour afficher')}
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
                  <a href={selected.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#e58c70]" data-testid="link-instagram-saved"><Instagram className="h-3.5 w-3.5" /> {tr('Instagram', 'انستجرام', 'Instagram')}</a>
                )}
                {selected.websiteUrl && (
                  <a href={selected.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#e58c70]" data-testid="link-website-saved"><Globe className="h-3.5 w-3.5" /> {tr('Website', 'الموقع الإلكتروني', 'Site web')}</a>
                )}
                {(selected.category === 'Restaurants' || selected.category === 'Cafes') && (selected.hasMenu || selected.menuUrl) && (
                  <a href={resolveImageSrc({ hasImage: selected.hasMenu, imageUrl: selected.menuUrl }, menuUrlFor(selected.id))!} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#e58c70]" data-testid="link-menu-saved"><FileText className="h-3.5 w-3.5" /> {tr('View menu', 'عرض القائمة', 'Afficher le menu')}</a>
                )}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#e9dfcd] p-3" data-testid="widget-rate-place">
              <div>
                <p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">
                  {ratingInfo?.avgRating != null ? `${ratingInfo.avgRating} ${tr('average', 'متوسط', 'moyenne')} · ${ratingInfo.ratingCount} ${tr('rating', 'تقييم', 'avis')}` : tr('No community ratings yet', 'لا توجد تقييمات مجتمع حتى الآن', 'Pas encore d\'avis communautaire')}
                </p>
                <p className="mt-1 text-xs font-semibold">{ratingInfo?.yourRating ? tr('Your rating', 'تقييمك', 'Votre avis') : tr('Rate this place', 'قيم هذا المكان', 'Noter ce lieu')}</p>
              </div>
              <StarRating value={ratingInfo?.yourRating ?? null} onRate={(stars) => rateMutation.mutate(stars)} />
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Where', 'الموقع', 'Ou')}</p><p className="mt-1 font-semibold">{selected.area}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Hours', 'الساعات', 'Horaires')}</p><p className="mt-1 font-semibold">{selected.hours}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Local note', 'ملاحظة محلية', 'Note locale')}</p><p className="mt-1 font-semibold">{selected.rating} {tr('rating', 'تقييم', 'avis')} · {selected.price}</p></div>
              <div className="rounded-xl bg-[#e9dfcd] p-3"><p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#476269]/70">{tr('Call', 'اتصل', 'Appeler')}</p><p className="mt-1 font-semibold">{selected.phone}</p></div>
            </div>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <a href={directionsUrlFor(selected)} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#183c44] px-4 py-3.5 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] hover:bg-[#24515a]" data-testid="link-get-directions-saved"><MapPin className="h-4 w-4 text-[#f1c575]" /> {tr('Get directions', 'احصل على الاتجاهات', 'Obtenir l\'itineraire')} <ExternalLink className="h-3.5 w-3.5 opacity-60" /></a>
              <button onClick={() => { unsaveMutation.mutate(selected.id); setSelected(null); }} className="flex items-center justify-center gap-2 rounded-xl border border-[#cfc0aa] px-4 py-3.5 text-xs font-bold uppercase tracking-[.12em] text-[#183c44] hover:border-[#e58c70]" data-testid="button-remove-saved-details"><Bookmark className="h-4 w-4" /> {tr('Remove', 'إزالة', 'Supprimer')}</button>
            </div>
          </div>
        </div>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
