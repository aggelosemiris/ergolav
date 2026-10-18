/* eslint-disable @next/next/no-img-element -- catalogue art is local SVG; next/image adds nothing here */
import { Heart, History, Music2 } from 'lucide-react';

export function Artwork({ src, alt, className = '', rounded = 'rounded-md', priority = false }: { src: string | null | undefined; alt: string; className?: string; rounded?: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-surface-3 text-subtle ${rounded} ${className}`} role="img" aria-label={alt}>
        <Music2 className="size-1/3" aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`aspect-square object-cover bg-surface-3 ${rounded} ${className}`}
    />
  );
}

/** Up to four album covers in a 2x2 grid, one cover, or a placeholder. */
export function PlaylistCover({ covers, name, className = '', rounded = 'rounded-md' }: { covers: string[]; name: string; className?: string; rounded?: string }) {
  if (covers.length >= 4) {
    return (
      <div role="img" aria-label={`Cover of ${name}`} className={`grid aspect-square grid-cols-2 overflow-hidden bg-surface-3 ${rounded} ${className}`}>
        {covers.slice(0, 4).map((c) => (
          <img key={c} src={c} alt="" loading="lazy" className="size-full object-cover" draggable={false} />
        ))}
      </div>
    );
  }
  if (covers.length > 0) return <Artwork src={covers[0]} alt={`Cover of ${name}`} className={className} rounded={rounded} />;
  return (
    <div role="img" aria-label={`Cover of ${name}`} className={`flex aspect-square items-center justify-center bg-gradient-to-br from-surface-3 to-surface-2 text-subtle ${rounded} ${className}`}>
      <Music2 className="size-1/3" aria-hidden="true" />
    </div>
  );
}

export function LikedCover({ className = '', rounded = 'rounded-md' }: { className?: string; rounded?: string }) {
  return (
    <div role="img" aria-label="Liked Songs" className={`flex aspect-square items-center justify-center bg-gradient-to-br from-[#5b3fd6] via-[#9b5bd8] to-accent ${rounded} ${className}`}>
      <Heart className="size-[42%] fill-text text-text" aria-hidden="true" />
    </div>
  );
}

export function HistoryCover({ className = '', rounded = 'rounded-md' }: { className?: string; rounded?: string }) {
  return (
    <div role="img" aria-label="Recently played" className={`flex aspect-square items-center justify-center bg-gradient-to-br from-[#1f5f6b] to-[#2f8f9d] ${rounded} ${className}`}>
      <History className="size-[42%] text-text" aria-hidden="true" />
    </div>
  );
}
