import './globals.css';
import AppShell from '../components/AppShell';
import { AuthProvider } from '../lib/auth-provider';
import { ToastProvider } from '../lib/toast';

export const metadata = { title: 'WasslChat - لوحة التحكم', description: 'منصة التجارة عبر واتساب' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans bg-gray-50 min-h-screen">
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
