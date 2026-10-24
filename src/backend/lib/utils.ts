import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'body-sm',
        'body-md',
        'body-lg',
        'label-sm',
        'label-md',
        'headline-sm',
        'headline-md',
        'headline-xl',
        'display-lg',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
