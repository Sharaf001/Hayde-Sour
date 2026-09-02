import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpenText, Clock3, MapPin, X } from 'lucide-react';
import { SiteNavbar } from '@/components/site-navbar';
import { BlurImage } from '@/components/blur-image';
import { ImageLightbox } from '@/components/image-lightbox';
import { useTranslation } from '@/lib/language';
import { useSwipeToClose } from '@/hooks/use-swipe-to-close';
import { fetchGallery, galleryImageUrlFor, resolveImageSrc, type GalleryItem } from '@/lib/api';

export default function HistoryPage() {
  const { language, tr } = useTranslation();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const detailSheet = useSwipeToClose<HTMLDivElement>(() => setSelected(null));

  const { data: historyItems = [], isLoading, isError } = useQuery({
    queryKey: ['gallery', 'history'],
    queryFn: () => fetchGallery('history'),
  });

  useEffect(() => {
    document.title = tr('History of Tyre | Hayde Sour', 'تاريخ صور | هيدي صور', 'Histoire de Tyr | Hayde Sour');
  }, [language, tr]);

  const localized = (english: string, arabic: string | null, french: string | null) => {
    if (language === 'ar') return arabic || english;
    if (language === 'fr') return french || english;
    return english;
  };

  return (
    <div className="noise min-h-[100dvh] bg-[#e9dfcd]">
      <SiteNavbar />

      <main className="mx-auto max-w-[1280px] px-5 pb-14 pt-28 lg:px-10 lg:pb-20 lg:pt-32">
        <p className="mb-3 flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]"><BookOpenText className="h-3.5 w-3.5" /> {tr('Tyre through time', 'صور عبر الزمن', 'Tyr a travers le temps')}</p>
        <h1 className="font-display text-5xl leading-[.94] tracking-[-.04em] text-[#183c44] sm:text-6xl">{tr('History of Tyre.', 'تاريخ مدينة صور.', 'Histoire de Tyr.')}</h1>
        <p className="mt-5 max-w-[520px] text-sm leading-6 text-[#476269]">{tr('Stories, landmarks, and moments that shaped one of the oldest continuously inhabited cities on the Mediterranean coast.', 'قصص ومعالم ومحطات صنعت واحدة من أقدم المدن المأهولة باستمرار على ساحل المتوسط.', 'Recits, reperes et moments qui ont faconne l\'une des plus anciennes villes continuellement habitees du littoral mediterraneen.')}</p>

        {isLoading && (
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="status-history-loading">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="relative min-h-[320px] overflow-hidden rounded-2xl border border-[#d7c9b4] bg-[#f9f0df]">
                <div className="h-40 bg-[#d8ccb8]/70" />
                <div className="pointer-events-none absolute inset-0 bg-[#183c44]/10 backdrop-blur-md" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-history-error">
            <p className="font-display text-3xl text-[#183c44]">{tr('Could not load history entries.', 'تعذر تحميل عناصر التاريخ.', 'Impossible de charger les entrees historiques.')}</p>
            <p className="mx-auto mt-2 max-w-[380px] text-sm leading-6 text-[#476269]">{tr('Make sure the backend is running and has history records in the database.', 'تأكد أن الخادم يعمل وأن قاعدة البيانات تحتوي على سجلات تاريخية.', 'Assurez-vous que le backend fonctionne et que la base contient des enregistrements historiques.')}</p>
          </div>
        )}

        {!isLoading && !isError && historyItems.length === 0 && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-history-empty">
            <BookOpenText className="mx-auto h-7 w-7 text-[#e58c70]" />
            <h3 className="mt-5 font-display text-3xl text-[#183c44]">{tr('No history entries yet.', 'لا توجد عناصر تاريخية بعد.', 'Aucune entree historique pour le moment.')}</h3>
            <p className="mx-auto mt-2 max-w-[380px] text-sm leading-6 text-[#476269]">{tr('Add records to the database to start building this timeline.', 'أضف سجلات إلى قاعدة البيانات لبدء بناء هذا الخط الزمني.', 'Ajoutez des enregistrements a la base pour commencer cette chronologie.')}</p>
          </div>
        )}

        {!isLoading && !isError && historyItems.length > 0 && (
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {historyItems.map((item) => {
              const src = resolveImageSrc(item, galleryImageUrlFor(item.id, item.updatedAt));
              const name = localized(item.name, item.nameAr, item.nameFr);
              const location = localized(item.location, item.locationAr, item.locationFr);
              const details = localized(item.details || tr('No story text was added for this entry yet.', 'لم تتم إضافة نص لهذا العنصر بعد.', 'Aucun texte n\'a encore ete ajoute pour cette entree.'), item.detailsAr, item.detailsFr);
              return (
                <article key={item.id} className="group flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-[#d7c9b4] bg-[#f9f0df] transition duration-300 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-history-${item.id}`}>
                  {src && (
                    <button className="block h-40 overflow-hidden" onClick={() => setLightboxSrc(src)} data-testid={`button-open-history-photo-${item.id}`}>
                      <BlurImage src={src} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </button>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-[#e58c70]">{tr('Historical chapter', 'فصل تاريخي', 'Chapitre historique')}</p>
                    <h2 className="mt-2 font-display text-3xl leading-none text-[#183c44]">{name}</h2>
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#476269]"><Clock3 className="h-3.5 w-3.5 text-[#e58c70]" /> {location}</p>
                    <p className="mt-3 text-sm leading-6 text-[#476269] line-clamp-4">{details}</p>
                    <button onClick={() => setSelected(item)} className="mt-auto w-fit pt-4 text-[11px] font-bold uppercase tracking-[.12em] text-[#183c44] hover:text-[#e58c70]" data-testid={`button-open-history-${item.id}`}>
                      {tr('Read more', 'اقرأ المزيد', 'Lire plus')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#183c44]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`${selected.name} details`} data-testid="dialog-history-details">
          <div ref={detailSheet.cardRef} className="relative max-h-[90dvh] w-full max-w-[700px] overflow-y-auto rounded-t-3xl bg-[#f9f0df] p-6 text-[#183c44] shadow-2xl sm:rounded-3xl sm:p-8">
            <div className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 touch-none rounded-full bg-[#d7c9b4] sm:hidden" aria-hidden="true" data-testid="handle-swipe-close-history-details" {...detailSheet.handleProps} />
            <button onClick={() => setSelected(null)} className="absolute right-5 top-5 touch-manipulation rounded-full border border-[#d7c9b4] p-2 text-[#476269] hover:text-[#e58c70]" aria-label={tr('Close details', 'إغلاق التفاصيل', 'Fermer les details')} data-testid="button-close-history-details"><X className="h-4 w-4" /></button>
            {resolveImageSrc(selected, galleryImageUrlFor(selected.id, selected.updatedAt)) && <BlurImage src={resolveImageSrc(selected, galleryImageUrlFor(selected.id, selected.updatedAt))!} alt={localized(selected.name, selected.nameAr, selected.nameFr)} containerClassName="mb-6 h-52 w-full rounded-2xl" className="h-52 w-full rounded-2xl object-cover" />}
            <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#e58c70]">{tr('Tyre history', 'تاريخ صور', 'Histoire de Tyr')}</p>
            <h2 className="mt-2 pr-8 font-display text-5xl leading-[.9]">{localized(selected.name, selected.nameAr, selected.nameFr)}</h2>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-[#476269]"><MapPin className="h-4 w-4 text-[#e58c70]" /> {localized(selected.location, selected.locationAr, selected.locationFr)}</p>
            <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#476269]">{localized(selected.details || tr('No story text was added for this entry yet.', 'لم تتم إضافة نص لهذا العنصر بعد.', 'Aucun texte n\'a encore ete ajoute pour cette entree.'), selected.detailsAr, selected.detailsFr)}</p>
          </div>
        </div>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
