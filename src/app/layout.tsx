import './globals.css';

export const metadata = { title: 'DeltaForce Acc Management', description: 'Kanban quản lý acc cày thuê' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
