import Image from 'next/image'
import { cn } from '@/backend/lib/utils'

interface AvatarProps {
  src: string
  alt: string
  size: number
  className?: string
  imageClassName?: string
}

export function Avatar({ src, alt, size, className, imageClassName }: AvatarProps) {
  return (
    <div
      className={cn('shrink-0 overflow-hidden rounded-full bg-surface-container', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src || '/placeholder.svg'}
        alt={alt}
        width={size}
        height={size}
        className={cn('h-full w-full object-cover', imageClassName)}
      />
    </div>
  )
}
