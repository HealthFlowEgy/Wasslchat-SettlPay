import './globals.css';
import DashboardLayout from '../components/DashboardLayout';

export const metadata = { title: 'WasslChat - لوحة التحكم', description: 'منصة التجارة عبر واتساب' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans bg-gray-50 min-h-screen">
        <DashboardLayout activePath="/">
          {children}
        </DashboardLayout>
      </body>
    </html>
  );
}
