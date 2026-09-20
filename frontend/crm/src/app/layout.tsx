import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '../providers/AppProviders';
import { MicrosoftClarity } from '../components/analytics/MicrosoftClarity';

export const metadata: Metadata = {
  title: 'AV Suite CRM',
  description: 'Healthcare CRM for Aarogya Virohan Suite',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased scroll-smooth">
        <MicrosoftClarity />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
