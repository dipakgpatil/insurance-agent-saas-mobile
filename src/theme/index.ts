export const colors = {
  bg: '#f4f7f6',
  surface: '#ffffff',
  surfaceMuted: '#eef4f2',
  surfaceSunken: '#e8efed',
  border: '#dce7e3',
  borderStrong: '#bccdc8',
  text: '#13211f',
  textMuted: '#52635f',
  textSubtle: '#758783',
  primary: '#0f766e',
  primaryDark: '#0b5f59',
  primaryLight: '#dcefeb',
  success: '#15803d',
  successLight: '#e3f4e9',
  warning: '#b45309',
  warningLight: '#f8eddc',
  danger: '#b91c1c',
  dangerLight: '#f7e4e4',
  info: '#0369a1',
  infoLight: '#e1eef6',
  accent: '#4f46e5',
  accentLight: '#e7e7fb',
  shadow: '#12201d',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const

export const typography = {
  display: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  title: {
    fontSize: 21,
    fontWeight: '700' as const,
    lineHeight: 27,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  micro: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
} as const

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

export function toneStyles(tone: Tone) {
  switch (tone) {
    case 'primary':
      return { background: colors.primaryLight, foreground: colors.primaryDark }
    case 'success':
      return { background: colors.successLight, foreground: colors.success }
    case 'warning':
      return { background: colors.warningLight, foreground: colors.warning }
    case 'danger':
      return { background: colors.dangerLight, foreground: colors.danger }
    case 'info':
      return { background: colors.infoLight, foreground: colors.info }
    case 'accent':
      return { background: colors.accentLight, foreground: colors.accent }
    case 'neutral':
    default:
      return { background: colors.surfaceMuted, foreground: colors.textMuted }
  }
}
