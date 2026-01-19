/**
 * Signatura Brand Color System
 *
 * A warm, empathetic color palette that reflects emotional intelligence.
 * The gradient flows from warm peach through soft rose and lavender to calming sky blue.
 */

export const signaturaColors = {
  // Primary gradient (left to right)
  gradient: {
    from: '#F4C5A5',  // Warm peach
    via1: '#F5D5E0',  // Soft pink
    via2: '#D5C5E8',  // Lavender
    to: '#B5D8E8',    // Light blue
  },

  // Individual brand colors
  peach: {
    light: '#F4C5A5',
    DEFAULT: '#E8A77D',
    dark: '#D88A5F',
  },
  rose: {
    light: '#F5D5E0',
    DEFAULT: '#E8B5CD',
    dark: '#D895B5',
  },
  lavender: {
    light: '#D5C5E8',
    DEFAULT: '#B8A5D8',
    dark: '#9B85C5',
  },
  sky: {
    light: '#B5D8E8',
    DEFAULT: '#8CC5DE',
    dark: '#6BAFD0',
  },

  // Semantic colors
  companion: '#E8B5CD',      // Rose for companion messages
  user: '#B5D8E8',           // Sky blue for user messages
  success: '#A5D8B8',        // Soft green
  warning: '#F4C5A5',        // Peach
  error: '#E8A5A5',          // Soft red

  // UI colors
  background: '#FDFBFF',     // Very light with hint of warmth
  surface: '#FFFFFF',
  text: {
    primary: '#2C1810',      // Warm dark brown
    secondary: '#6B5555',    // Muted brown
    tertiary: '#9B8585',     // Light brown
  },
} as const

// Tailwind CSS configuration export
export const tailwindColors = {
  peach: signaturaColors.peach,
  rose: signaturaColors.rose,
  lavender: signaturaColors.lavender,
  sky: signaturaColors.sky,
  // Semantic
  companion: signaturaColors.companion,
  'companion-user': signaturaColors.user,
  success: signaturaColors.success,
  warning: signaturaColors.warning,
  error: signaturaColors.error,
}

// CSS gradient for backgrounds
export const gradientCSS = `linear-gradient(90deg, ${signaturaColors.gradient.from} 0%, ${signaturaColors.gradient.via1} 33%, ${signaturaColors.gradient.via2} 66%, ${signaturaColors.gradient.to} 100%)`

// Tailwind gradient classes helper
export const gradientClasses = {
  // Full gradient background
  bg: 'bg-gradient-to-r from-peach-light via-rose-light via-lavender-light to-sky-light',
  // Text gradient
  text: 'bg-gradient-to-r from-peach via-rose via-lavender to-sky bg-clip-text text-transparent',
  // Border gradient (use with border-transparent and bg-clip-padding)
  border: 'bg-gradient-to-r from-peach-light via-rose-light via-lavender-light to-sky-light',
}

// Design tokens for consistent spacing and styling
export const designTokens = {
  // Border radius
  radius: {
    sm: '0.375rem',    // rounded-md
    DEFAULT: '0.5rem', // rounded-lg
    lg: '0.75rem',     // rounded-xl
    xl: '1rem',        // rounded-2xl
    full: '9999px',
  },
  // Shadows (soft, not harsh)
  shadow: {
    sm: '0 1px 2px 0 rgb(44 24 16 / 0.03)',
    DEFAULT: '0 1px 3px 0 rgb(44 24 16 / 0.05), 0 1px 2px -1px rgb(44 24 16 / 0.05)',
    md: '0 4px 6px -1px rgb(44 24 16 / 0.05), 0 2px 4px -2px rgb(44 24 16 / 0.05)',
    lg: '0 10px 15px -3px rgb(44 24 16 / 0.05), 0 4px 6px -4px rgb(44 24 16 / 0.05)',
  },
  // Transitions
  transition: {
    DEFAULT: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    gentle: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
}

// Export type for TypeScript
export type SignaturaColors = typeof signaturaColors
export type TailwindColors = typeof tailwindColors
