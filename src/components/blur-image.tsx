import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BlurImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'className'> & {
  className?: string;
  containerClassName?: string;
  overlayClassName?: string;
};

export function BlurImage({
  className,
  containerClassName,
  overlayClassName,
  onLoad,
  onError,
  src,
  alt,
  ...props
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  if (!src) return null;

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      <img
        {...props}
        src={src}
        alt={alt}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setLoaded(true);
          onError?.(event);
        }}
        className={cn('transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', className)}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 bg-[#183c44]/20 backdrop-blur-md transition-opacity duration-500',
          loaded ? 'opacity-0' : 'opacity-100',
          overlayClassName,
        )}
      />
    </div>
  );
}
