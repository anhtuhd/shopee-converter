import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata = {
  metadataBase: new URL('https://pishare.site'),
  title: 'PiShare - Nhận Hoàn Tiền Khi Mua Sắm Online',
  description: 'Hệ thống chuyển đổi link Shopee Affiliate chuyên nghiệp, rút gọn link và nhận hoàn tiền mua sắm trực tuyến nhanh chóng, tự động.',
  icons: {
    icon: '/logo.jpg',
    shortcut: '/favicon.ico',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'PiShare - Nhận Hoàn Tiền Khi Mua Sắm Online',
    description: 'Hệ thống chuyển đổi link Shopee Affiliate chuyên nghiệp, rút gọn link và nhận hoàn tiền mua sắm trực tuyến nhanh chóng, tự động.',
    url: 'https://pishare.site',
    siteName: 'PiShare',
    images: [
      {
        url: '/thumbnail.png',
        width: 1024,
        height: 571,
        alt: 'PiShare Banner',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PiShare - Nhận Hoàn Tiền Khi Mua Sắm Online',
    description: 'Hệ thống chuyển đổi link Shopee Affiliate chuyên nghiệp, rút gọn link và nhận hoàn tiền mua sắm trực tuyến nhanh chóng, tự động.',
    images: ['/thumbnail.png'],
  },
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
