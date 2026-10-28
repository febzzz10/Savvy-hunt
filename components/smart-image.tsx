import Image from "next/image";

export function SmartImage({
  src,
  alt,
  sizes,
  className = "object-cover",
  priority = false,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-paper-deep">
        <span className="eyebrow text-muted">Image unavailable</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
