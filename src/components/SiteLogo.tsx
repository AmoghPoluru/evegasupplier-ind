import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 682;
/** Display height — 2× the original h-10 (40px → 80px). */
const DEFAULT_LOGO_HEIGHT_CLASS = 'h-20';

export const SITE_LOGO_ALT =
  'B2B Zvastra — Ethnic Fusion, Jewellery, Home';

type SiteLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function SiteLogo({
  href,
  className,
  imageClassName,
  priority = false,
}: SiteLogoProps) {
  const image = (
    <Image
      src="/logo.jpg"
      alt={SITE_LOGO_ALT}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn(DEFAULT_LOGO_HEIGHT_CLASS, 'w-auto object-contain', imageClassName)}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn('flex shrink-0 items-center', className)}
        aria-label={SITE_LOGO_ALT}
      >
        {image}
      </Link>
    );
  }

  return (
    <div className={cn('flex shrink-0 items-center', className)}>{image}</div>
  );
}
