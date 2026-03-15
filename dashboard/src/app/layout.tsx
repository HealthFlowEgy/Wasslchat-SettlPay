import './globals.css';
export const metadata = { title: 'WasslChat - لوحة التحكم', description: 'منصة التجارة عبر واتساب' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body className="font-sans bg-surface-50 min-h-screen">{children}</body></html>;
}
