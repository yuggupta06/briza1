import { cn } from '@/backend/lib/utils'

interface IconProps {
  name: string
  filled?: boolean
  className?: string
}

export function Icon({ name, filled = false, className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      data-filled={filled}
      className={cn('material-symbols-outlined select-none', className)}
    >
      {name}
    </span>
  )
}

export default Icon;
