import { useState } from 'react';
import { Star } from 'lucide-react';

export function StarRating({
  value,
  onRate,
  size = 'md',
}: {
  value: number | null;
  onRate?: (stars: number) => void;
  size?: 'sm' | 'md';
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  return (
    <div className="flex items-center gap-1" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onRate}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => onRate && setHover(star)}
          onMouseLeave={() => onRate && setHover(null)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          className={onRate ? 'cursor-pointer' : 'cursor-default'}
          data-testid={`star-${star}`}
        >
          <Star
            className={`${dim} transition ${star <= display ? 'fill-[#f1c575] text-[#f1c575]' : 'fill-transparent text-[#c9bba5]'}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
