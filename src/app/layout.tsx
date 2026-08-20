import { Inter, Rajdhani, JetBrains_Mono, Geist } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="vi" className={cn("dark font-sans", geist.variable)}>
      <body className={`${inter.className} ${rajdhani.variable} ${jetbrains.variable} h-screen overflow-hidden bg-background text-foreground`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
