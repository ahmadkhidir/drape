import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/providers/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF9F5' },
    { media: '(prefers-color-scheme: dark)', color: '#11100F' },
  ],
};

export const metadata: Metadata = {
  title: 'Drape — The Sensory Digital Fabric Atelier',
  description:
    'Experience luxury textiles with physically accurate neural draping, tactile provence, and bespoke couture fitting.',
  keywords: [
    'luxury fabric',
    'haute couture',
    'textile simulation',
    'WebGPU',
    'neural fitting',
    'silk duchesse',
    'bespoke tailoring',
  ],
  authors: [{ name: 'Drape Atelier' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-alabaster dark:bg-obsidian text-ink dark:text-alabaster font-sans antialiased selection:bg-gold/25 selection:text-ink">
        <ThemeProvider defaultTheme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
