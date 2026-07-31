import { Inter, Rajdhani, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AudioPlayer } from '@/components/ui/audio-player';
import { HeaderNav } from '@/components/layout/header-nav';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const rajdhani = Rajdhani({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-rajdhani' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata = { title: 'DeltaForce Acc Management', description: 'Kanban quản lý acc cày thuê' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} ${rajdhani.variable} ${jetbrains.variable} h-screen flex flex-col overflow-hidden bg-midnight text-gray-200`}>
        <HeaderNav />
        <main className="flex-1 min-h-0 relative overflow-y-auto">
          {children}
        </main>
        <Footer />
        <AudioPlayer />
      </body>
    </html>
  );
}
