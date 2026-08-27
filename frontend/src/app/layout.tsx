import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdvertisementProvider } from '@/contexts/AdvertisementContext';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { TourProvider } from '@/contexts/TourContext';
import AccessibilityPanel from '@/components/AccessibilityPanel';
import OnboardingManager from '@/components/OnboardingManager';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VíaLibre - Conectando problemáticas con talento',
  description: 'Plataforma de crowdsourcing e innovación abierta para Universidades',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-medium"
        >
          Saltar al contenido principal
        </a>
        <AuthProvider>
          <AdvertisementProvider>
            <AccessibilityProvider>
              <TourProvider>
                {children}
                <AccessibilityPanel />
                <OnboardingManager />
              </TourProvider>
            </AccessibilityProvider>
          </AdvertisementProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
