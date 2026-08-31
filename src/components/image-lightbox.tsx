import { X } from 'lucide-react';

export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      data-testid="dialog-image-lightbox"
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full border border-white/30 p-2 text-white hover:bg-white/10"
        aria-label="Close image"
        data-testid="button-close-lightbox"
      >
        <X className="h-5 w-5" />
      </button>
      <img src={src} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
