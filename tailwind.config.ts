import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Signatura Brand Colors - Warm, Empathetic Palette
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
        companion: {
          DEFAULT: '#E8B5CD',
          light: '#F5D5E0',
          dark: '#D895B5',
          foreground: '#2C1810',
        },
        'companion-user': {
          DEFAULT: '#B5D8E8',
          light: '#D5E8F0',
          dark: '#8CC5DE',
          foreground: '#2C1810',
        },
        success: {
          DEFAULT: '#A5D8B8',
          light: '#C5E8D0',
          dark: '#85C598',
          foreground: '#1A2C1E',
        },
        warning: {
          DEFAULT: '#F4C5A5',
          light: '#F8DBC5',
          dark: '#E8A77D',
          foreground: '#2C1810',
        },
        error: {
          DEFAULT: '#E8A5A5',
          light: '#F0C5C5',
          dark: '#D88585',
          foreground: '#2C1010',
        },

        // Text colors
        'text-primary': '#2C1810',
        'text-secondary': '#6B5555',
        'text-tertiary': '#9B8585',
      },
      backgroundColor: {
        'surface': '#FFFFFF',
        'brand': '#FDFBFF',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgb(44 24 16 / 0.03)',
        'soft': '0 1px 3px 0 rgb(44 24 16 / 0.05), 0 1px 2px -1px rgb(44 24 16 / 0.05)',
        'soft-md': '0 4px 6px -1px rgb(44 24 16 / 0.05), 0 2px 4px -2px rgb(44 24 16 / 0.05)',
        'soft-lg': '0 10px 15px -3px rgb(44 24 16 / 0.05), 0 4px 6px -4px rgb(44 24 16 / 0.05)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-gentle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-gentle": "pulse-gentle 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #F4C5A5 0%, #F5D5E0 33%, #D5C5E8 66%, #B5D8E8 100%)',
        'brand-gradient-vertical': 'linear-gradient(180deg, #F4C5A5 0%, #F5D5E0 33%, #D5C5E8 66%, #B5D8E8 100%)',
        'brand-gradient-diagonal': 'linear-gradient(135deg, #F4C5A5 0%, #F5D5E0 33%, #D5C5E8 66%, #B5D8E8 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
