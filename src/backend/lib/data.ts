export interface User {
  name: string
  handle: string
  avatar: string
  avatarAlt: string
}

export interface Story {
  handle: string
  avatar: string
  avatarAlt: string
}

export interface Comment {
  author: string
  text: string
}

export interface Post {
  id: string
  author: User & { verified: boolean }
  location: string
  postedAt: string
  image: string
  imageAlt: string
  aspect: 'portrait' | 'landscape'
  badge: { icon: string; label: string }
  likes: number
  likedByDefault: boolean
  commentCount: number
  caption: string
  tags: string[]
  comments: Comment[]
}

export interface Creator {
  name: string
  subtitle: string
  avatar: string
  avatarAlt: string
}

export interface Topic {
  tag: string
  posts: string
}

export interface NavItem {
  label: string
  icon: string
  href: string
  active?: boolean
  shortcut?: string
  badge?: number
  dot?: boolean
  accentIcon?: boolean
}

export const currentUser: User = {
  name: 'Julian Vance',
  handle: 'julianv',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBaUczvhXoVN6WKztBIwFE8iCEUNZn5MWiWwPHFLeXbo6xlkBvWq7K-UWrwBRUDHAG1Uml98SvHiTl178lQU4ilDBhGQj0by70AmxFVZftZtDMLuRF_AnKk48PsqTK431CZcX37BGAGMSQ-RP7aJafVm--ku8Wrs0RaHt0ZfYPd8wWuAQJMhVhMakxTScX4qY8-1swchMcZHz0Sj8_32uIsfMDL8d53CxOzGVWLWLQ',
  avatarAlt: 'Portrait of Julian Vance',
}

export const currentUserStoryAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuApv7RQH_cSKl3dGBEg5XgsVnRNC9GAljpJxN3o2m6V1Ib0Jcf6qJSnH6Z_XWTLqdGcH4x1umBBjY-34QmLvHptlunSYl2gEShmsMU9vrrlodSCuZwSYUTb4NfhWBkrqKjrqe4QjHfS-QsbrxNy8QfMHTTIKQOEmA2Ica7u_8qBx9Z_nGIX7PlKsiPv_wifdCNnHpsxpVsRR8EbvLwzxOfoXx3CUEDjMqRDaT773j0'

export const currentUserCardAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDK3aXUxVLO1SgAVoISyD_gzGAM2PnTdyFVAHbxBlysn6NWpSRZFzkKWG_GAstdnHERxO-HF2dfvIOvL-SOTyWXZDnDmS9TZmCkagan1xwdHpyF6REoAF_fdeNC-rY6e2pJ-4vG8ZT9DE-HYorA7WpVOf_MBeG0zP_DjEQsFGEeP3o5Lr8z4ydlk33N0iSqJ0dcN8jzafWACv6bSieDhfhMW-tzTV1PEt0lUDIMe34'

export const sidebarNav: NavItem[] = [
  { label: 'Home', icon: 'home', href: '/', active: true },
  { label: 'Search', icon: 'search', href: '/search', shortcut: '⌘K' },
  { label: 'Upload', icon: 'add_circle', href: '/upload', dot: true, accentIcon: true },
  { label: 'Messages', icon: 'mail', href: '/messages', badge: 3 },
  { label: 'Profile', icon: 'person', href: '/profile' },
]

export const mobileNav: NavItem[] = [
  { label: 'Home', icon: 'home', href: '/', active: true },
  { label: 'Search', icon: 'search', href: '/search' },
  { label: 'Upload', icon: 'add_box', href: '/upload', accentIcon: true },
  { label: 'Messages', icon: 'mail', href: '/messages', dot: true },
  { label: 'Profile', icon: 'person', href: '/profile' },
]

export const stories: Story[] = [
  {
    handle: 'elena_lens',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBvXPXd7umBH0FqUyJVENk7CoC3CBOm_Qv8vN3_KE-5UrFsLF3f0Zp8VcVp-d1WeKNCTthOAs3rCgQJPuXlh5bf_59XYcBRenXVjdpAFzuV1uZhJRI_5waXb28osBLxykxNL0v1kcgGPNlECoIp9ciXQED6FEbBFtFqxcnJUwsC313ZBVo5tPzWqHGMKiMJ6WeLeAMl4BRgw4nJlKiRIXYSdbVf0EM24oJesd8S0wc',
    avatarAlt: 'Portrait of Elena Rostova',
  },
  {
    handle: 'studio_kairo',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDy_OhSPL8lQXqD5VLqAwI9XfhKjRpv4O70OJ_uuHb5yZJ5BLsbymomgsPgmpHpnVHYvGwE4c3uWqbEvX1djSyHUOORjkcsjzCvORVSo6X1Tljtq3wascThXXCdG1s6nLNdn0DGYv8TyZ-1smrc1MrpQZOredMICJ5IDCpIBz4bprSK5niCNEJIlQnZQKQCjZ5sXRq9fbmEIEOKZ36ZB8NeWvunpXHYivBcuX3fzxI',
    avatarAlt: 'Portrait of a design architect from Studio Kairo',
  },
  {
    handle: 'marcus.raw',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAM94AL8jaLOX0FJjx6nZye3CsrCbPowLRZ4jU56kKHWrvWNhpBUFR-MRVJu_A_hligggIhaKNLZdfXsbqdm1po2nuvpzVsCXF3qcUpzxUDo3kfQK_McUU3Q4GMt9OHnY9wezfnsPd8aZLx3V8RmVAH6CqzBc5IIGcCc2hU4F-IMs2sxWgHMDY66PL2J7xyLJ5SaxUQ4422O9-FxY-xi2206tX-kd7YSGtKpBMZcSg',
    avatarAlt: 'Portrait of Marcus Thorne',
  },
  {
    handle: 'nordic_light',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB0jP4VMcs_szXVrkfJkGNsvwaLLfMJ4qLneYvJu6iErmathcyYWqOMuOC-cUyn-46y-WfGF91hw6dWLcG6IPj7tQk8gN-BcCYvi31xDRhZO9Z22WpTtdjJgAjAncunr0c2NS7FmsWvVMCO13gFQzZJhC5DgvwA7EzlDOUMnQv-geh5fS5qeE-KUYBWVa7L_2SGljJwNnOD6uP7BGFrCv5pBT3zR0t6LPT5hzDBibM',
    avatarAlt: 'Portrait of a Scandinavian fine-art curator',
  },
]

export const posts: Post[] = [
  {
    id: 'post-1',
    author: {
      name: 'Elena Rostova',
      handle: 'elena_lens',
      verified: true,
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA7Nd3KWcm7AB1U5dTXKhF2Yk0xoqBgvhu857Xhu31V1AfsgRqROMOLSi5UQjcUM8lp_BQ94TZb22nhSXUnU6zNfDyXvwfAKhhQ0c36JTDXheufxQDtWj-lr8UHRijx-vVAwGBHd9aT2kn9OC6ucC2iCditD2zrlrZTEp0MLtcJkUBYTCAn5tX8GV9Tzum80L_VDuSgXHHpSe2Rz9g35gFuUxJofAH5Bd_idpjrMBY',
      avatarAlt: 'Portrait of Elena Rostova',
    },
    location: 'Copenhagen, Denmark',
    postedAt: '2h ago',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBbj5VIlAqq9DCt8jBRey8ZlAt16Qv99poNK_65PL_nDfG7HJsrxf1ZXvT70cqlwNAGLuXrg_XwMSYqfZJHIqoucKY8D8Ua6GsPx6E-6IsQuw0gIy4vKY9tg91dUrSjrLmv8Y0GwvdpOh8B6NvSKdZcM3LTgdHJDkCcdfDN0ktlxVWFJCIChgSvBvbhAjOYvwcvbaahOjg84s13-UWN1UCmlMYCWh2wjp0IARpPekQ',
    imageAlt:
      'Raw concrete geometry in a minimalist museum gallery in Copenhagen, with morning sunlight casting sharp shadows across terrazzo floors.',
    aspect: 'portrait',
    badge: { icon: 'photo_camera', label: '50mm • ƒ/1.8 • 1/250s' },
    likes: 4820,
    likedByDefault: true,
    commentCount: 142,
    caption:
      'Form follows light. Exploring morning cast shadows in the newly completed studio wing.',
    tags: ['architecture', 'minimalism', 'design'],
    comments: [
      { author: 'kai_architect', text: 'The tonal balance here is sublime' },
      { author: 'sophia.v', text: 'Which lens did you shoot this with?' },
    ],
  },
  {
    id: 'post-2',
    author: {
      name: 'Marcus Thorne',
      handle: 'marcus_raw',
      verified: true,
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDUgGVvTAXcBmQISrfhbVyhBip9w-CKYR-W0T3q8BhfKpiekx-Kk1qvsc-F9RJ_QDOapq4kHuuM2ljkk-HpNycJF5EmlqjvfmDJAJbzSCYtnyQo-qMaiSS6UdcvONtwywEzSOIOjGyJ1AnQBcD6tEQjcfKXgMVPocKb6Do1-sDmrzQqlcQ-xEvOTluQqwDUlh5t-fIJMfJbASEmsg_YpvIwYd8WU-gJqSmQaXP4s9c',
      avatarAlt: 'Portrait of Marcus Thorne',
    },
    location: 'Lofoten, Norway',
    postedAt: '5h ago',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAQ2p3CnaPeIgsuoqAFeM3s-xVTig6AWdwawY3oyjpstUPZnpDhQtQCK9GO_mEnaJEqvRxCWQlomf-C5QK1aJrLWszCSSQX0got5BA7e9HA5G3APpXc1wm47jVkYI-l01a1opdg7Op1nkdxyZWub4hkqLzN4MrX3GLXyC55HZkwgZSoAsj-QXO9TO88JycTzTq4402e4VZ5zTmRxYMBV-LwlJTEs3jk8vwgwxp3_ag',
    imageAlt:
      'Moody coastal mountain peaks in Lofoten, Norway reflected in still fjord waters under cold twilight mist.',
    aspect: 'landscape',
    badge: { icon: 'landscape', label: 'Lofoten Archipelago Series 04' },
    likes: 12400,
    likedByDefault: false,
    commentCount: 318,
    caption:
      'Midnight twilight over the northern fjords. The silence out here is almost tangible. Uncompressed Hasselblad capture.',
    tags: ['cinematic', 'norway', 'landscape'],
    comments: [],
  },
]

export const creators: Creator[] = [
  {
    name: 'Maya Chen',
    subtitle: 'Followed by 12 mutuals',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB5SuAe4HcyY6Jxd4Rg6EZEHuohXy7hXZhOmQAmt0ly1UZr8I18n9_iI-I_CNW2eNqDFtPF3AzM6pj1F6wGtrwB0CQSRIm8iVIDb3Y8H7f0dMAx1TFAl5K5P0DP013iuwTo4BcZ92Szn7D8fFJz-Tw70dLXuOc0K2L2T1s1d5m99XH_8ob-bQtt-WxUwIluXPawt0SS_4TwA1qmRYZhr4nCj6GTEV5q89_-bz7bN98',
    avatarAlt: 'Portrait of Maya Chen',
  },
  {
    name: 'Arlo V',
    subtitle: 'Followed by 8 mutuals',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD2xMjvGaxFcLwgL7ua1NOla6tNkjZrMChhzczbU-C9K8um3PUzO0P8wyInGLXfsLhm419hTiBX75HhAVxOg_24y35MU6zHrvY0W2X18NAyV2EDGHpKhUXHdX5PPYg7SeUupW88188ZoCwVnKev5uLJqhMdemZevnxDUV2VeTBnPa5ndtHYvcfK6AfbDtS7515jKpOvhXhrdKt-6b-HImJaIXKRoYt90ZjlzGYE1oM',
    avatarAlt: 'Portrait of Arlo Vance',
  },
  {
    name: 'Studio Monolith',
    subtitle: 'Brand Architecture',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDxL0JdQ-DJhhvh_p1exawK0emQWEZCQpa7iKjhatKH8C9kfmCMfHz-XaJk0fHZGNYosWbv7b_vO4KNQIwoI43jTaDSyMJt5kEikiMudGm-fqx3UsbKP0g3IQXPfJnemh7LSANyBf1Yi4SN1iBNVayCUSA_MLUhITl7ByPJaK5ZcD2gNKkl0lbz-5vS9MMMVYVF2FjdTB-t3QCfY1_jSpnqKMWxCzicjpksmXT3Umc',
    avatarAlt: 'Studio Monolith logo',
  },
]

export const topics: Topic[] = [
  { tag: 'MinimalArchitecture', posts: '24.8k posts' },
  { tag: 'CinematicShots', posts: '89.2k posts' },
  { tag: '3DGenerative', posts: '14.5k posts' },
  { tag: 'GrainAndLight', posts: '9.1k posts' },
]

export const footerLinks: string[] = ['About', 'Help', 'Press', 'API', 'Jobs', 'Privacy', 'Terms']
