import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', 'class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: '#0A2533',
  				foreground: '#FFFFFF'
  			},
  			secondary: {
  				DEFAULT: '#F5F0E8',
  				foreground: '#0A2533'
  			},
  			destructive: {
  				DEFAULT: '#C41E3A',
  				foreground: '#FFFFFF'
  			},
  			muted: {
  				DEFAULT: '#F5F0E8',
  				foreground: '#5A6670'
  			},
  			accent: {
  				DEFAULT: '#C25B2E',
  				foreground: '#FFFFFF'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  	},
  	borderRadius: {
  		lg: 'var(--radius)',
  		md: 'calc(var(--radius) - 2px)',
  		sm: 'calc(var(--radius) - 4px)'
  	},
  	keyframes: {
  		'accordion-down': {
  			from: {
  				height: '0'
  			},
  			to: {
  				height: 'var(--radix-accordion-content-height)'
  			}
  		},
  		'accordion-up': {
  			from: {
  				height: 'var(--radix-accordion-content-height)'
  			},
  			to: {
  				height: '0'
  			}
  		}
  	},
  	animation: {
  		'accordion-down': 'accordion-down 0.2s ease-out',
  		'accordion-up': 'accordion-up 0.2s ease-out'
  	}
  }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config
