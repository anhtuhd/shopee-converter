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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "PiShare",
    "url": "https://pishare.site",
    "description": "Hệ thống chuyển đổi link Shopee Affiliate chuyên nghiệp, rút gọn link và nhận hoàn tiền mua sắm trực tuyến tự động.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires HTML5, Javascript, CSS3",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "VND"
    }
  };

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
