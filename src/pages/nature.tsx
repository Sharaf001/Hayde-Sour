import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SiteNavbar } from '@/components/site-navbar';
import { ArrowLeft, ExternalLink, Leaf, MapPin, X } from 'lucide-react';
import { AppMark } from '@/App';
import { ImageLightbox } from '@/components/image-lightbox';
import {
  directionsUrlFor,
  fetchGallery,
  fetchGalleryItemGallery,
  galleryImageUrlFor,
  galleryItemSubGalleryImageUrlFor,
  resolveImageSrc,
  type GalleryItem,
} from '@/lib/api';

export default function NaturePage() {
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const { data: naturePlaces = [], isLoading, isError } = useQuery({
    queryKey: ['gallery', 'nature'],
    queryFn: () => fetchGallery('nature'),
  });

  const { data: extraPhotos = [] } = useQuery({
    queryKey: ['gallery-item-gallery', selected?.id],
    queryFn: () => fetchGalleryItemGallery(selected!.id),
    enabled: !!selected,
  });

  return (
    <div className="noise min-h-[100dvh] bg-[#e9dfcd]">
    <SiteNavbar />

      <main className="mx-auto max-w-[1280px] px-5 pb-14 pt-28 lg:px-10 lg:pb-20 lg:pt-32">
        <p className="mb-3 flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[.22em] text-[#e58c70]"><Leaf className="h-3.5 w-3.5" /> Where to go nature</p>
        <h1 className="font-display text-5xl leading-[.94] tracking-[-.04em] text-[#183c44] sm:text-6xl">Open air, open water.</h1>
        <p className="mt-5 max-w-[430px] text-sm leading-6 text-[#476269]">Coastline, ruins and the quieter corners of Sour worth stepping outside for.</p>

        {isLoading && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-nature-loading">
            <p className="font-display text-3xl text-[#183c44]">Loading…</p>
          </div>
        )}
        {isError && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-nature-error">
            <p className="font-display text-3xl text-[#183c44]">Couldn't reach the API.</p>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">Make sure the backend server in /server is running.</p>
          </div>
        )}
        {!isLoading && !isError && naturePlaces.length === 0 && (
          <div className="mt-9 rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df] px-6 py-16 text-center" data-testid="status-nature-empty">
            <Leaf className="mx-auto h-7 w-7 text-[#e58c70]" />
            <h3 className="mt-5 font-display text-3xl text-[#183c44]">Nothing here yet.</h3>
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#476269]">Entries added in the admin panel will show up here.</p>
          </div>
        )}

        {!isLoading && !isError && naturePlaces.length > 0 && (
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {naturePlaces.map((place) => {
              const src = resolveImageSrc(place, galleryImageUrlFor(place.id));
              return (
                <button
                  key={place.id}
                  onClick={() => setSelected(place)}
                  className="group relative min-h-[260px] overflow-hidden rounded-2xl text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  data-testid={`card-nature-${place.id}`}
                >
                  {src ? (
                    <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#a8c3a0]"><Leaf className="h-8 w-8 text-[#183c44]/40" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#183c44]/85 via-[#183c44]/10 to-transparent" />
                  <div className="absolute bottom-0 p-5 text-[#f9f0df]">
                    <p className="font-display text-2xl leading-none">{place.name}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#f9f0df]/75"><MapPin className="h-3.5 w-3.5 text-[#f1c575]" /> {place.location}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#183c44]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`${selected.name} details`} data-testid="dialog-nature-details">
          <div className="relative max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-[#f9f0df] p-6 text-[#183c44] shadow-2xl sm:rounded-3xl sm:p-8">
            <button onClick={() => setSelected(null)} className="absolute right-5 top-5 rounded-full border border-[#d7c9b4] p-2 text-[#476269] hover:text-[#e58c70]" aria-label="Close details" data-testid="button-close-nature-details"><X className="h-4 w-4" /></button>
            {resolveImageSrc(selected, galleryImageUrlFor(selected.id)) && <img src={resolveImageSrc(selected, galleryImageUrlFor(selected.id))!} alt="" className="mb-6 h-44 w-full rounded-2xl object-cover" />}
            {extraPhotos.length > 0 && (
              <div className="mb-6 grid grid-cols-3 gap-2">
                {extraPhotos.map((photo) => {
                  const src = resolveImageSrc(photo, galleryItemSubGalleryImageUrlFor(selected.id, photo.position));
                  if (!src) return null;
                  return (
                    <button
                      key={photo.position}
                      onClick={() => setLightboxSrc(src)}
                      className="group relative h-20 w-full overflow-hidden rounded-xl"
                      data-testid={`button-view-nature-photo-${photo.position}`}
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
            <h2 className="mt-2 pr-8 font-display text-5xl leading-[.9]">{selected.name}</h2>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-[#476269]"><MapPin className="h-4 w-4 text-[#e58c70]" /> {selected.location}</p>
            <a href={directionsUrlFor(selected)} target="_blank" rel="noreferrer" className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-[#183c44] px-4 py-3.5 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] hover:bg-[#24515a]" data-testid="link-get-directions-nature"><MapPin className="h-4 w-4 text-[#f1c575]" /> Get directions <ExternalLink className="h-3.5 w-3.5 opacity-60" /></a>
          </div>
        </div>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
