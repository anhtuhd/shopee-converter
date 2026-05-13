import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata = {
  title: 'Shopee Link Converter',
  description: 'Chuyển đổi link rút gọn Shopee',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
