import './globals.css';
import AppShell from '../components/AppShell';
import { AuthProvider } from '../lib/auth-provider';

export const metadata = { title: 'WasslChat - لوحة التحكم', description: 'منصة التجارة عبر واتساب' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans bg-gray-50 min-h-screen">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
