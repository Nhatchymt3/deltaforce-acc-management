import { Inter, Rajdhani, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const rajdhani = Rajdhani({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-rajdhani' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata = {
  title: 'DeltaForce Acc Management',
  description: 'Kanban quản lý acc cày thuê',
  icons: {
    icon: '/icon.jpg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} ${rajdhani.variable} ${jetbrains.variable} h-screen overflow-hidden bg-midnight text-gray-200`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
