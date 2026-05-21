'use client';

import Link from 'next/link';

export default function Instructions() {
  const steps = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: '#1a73e8' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
        </svg>
      ),
      title: '1. Đăng ký & Cập nhật QR Code',
      desc: 'Để tham gia nhận hoàn tiền tự động, trước tiên bạn cần đăng ký tài khoản. Sau đó, hãy truy cập mục "Thông tin cá nhân" và tải lên ảnh QR Code tài khoản ngân hàng của bạn để nhận thanh toán tự động khi đối soát.',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: '#ea4335' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      ),
      title: '2. Tag Shopee Video & Live',
      desc: 'Lưu ý cực kỳ quan trọng: Các sản phẩm được đặt mua có gắn tag "Shopee Video" hoặc "Shopee Live" sẽ KHÔNG ĐƯỢC ghi nhận hoa hồng hoàn tiền từ đối tác tiếp thị liên kết.',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: '#34a853' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 1 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
      ),
      title: '3. Khuyến nghị "Mua Ngay"',
      desc: 'Sau khi chuyển đổi link sản phẩm thành công trên hệ thống của chúng tôi và được dẫn sang Shopee, bạn nên bấm chọn nút "Mua ngay" để thanh toán, nhằm đảm bảo đơn hàng được ghi nhận hoàn tiền chính xác nhất.',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: '#fbbc05' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
        </svg>
      ),
      title: '4. Chu kỳ đối soát & Thanh toán',
      desc: 'Toàn bộ hoa hồng tích lũy hợp lệ của bạn sẽ được hệ thống tổng hợp đối soát và tự động chuyển khoản thanh toán vào ngày 15 hàng tháng qua tài khoản ngân hàng từ mã QR bạn cung cấp.',
    },
  ];

  return (
    <div className="main-container" style={{ paddingTop: '40px', paddingBottom: '60px', minHeight: '100vh', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
      <div style={{ maxWidth: '800px', width: '100%', padding: '0 16px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#202124', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Hướng dẫn nhận Hoàn tiền Shopee
          </h1>
          <p style={{ fontSize: '16px', color: '#5f6368', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Hãy dành vài phút xem qua các chính sách và hướng dẫn bên dưới để đảm bảo mọi đơn hàng của bạn đều được ghi nhận hoàn tiền thành công và chính xác.
          </p>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '40px' }}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '20px',
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #dfe1e5',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = '#dadce0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02)';
                e.currentTarget.style.borderColor = '#dfe1e5';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#f8f9fa', flexShrink: 0 }}>
                {step.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#202124', marginBottom: '8px' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#5f6368', lineHeight: '1.6' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#e8f0fe', borderRadius: '16px', border: '1px solid #c3ecf6' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1967d2', marginBottom: '8px' }}>
            Bắt đầu nhận hoàn tiền ngay hôm nay!
          </h3>
          <p style={{ fontSize: '14px', color: '#1967d2', marginBottom: '20px', opacity: 0.9 }}>
            Chuyển đổi liên kết sản phẩm Shopee của bạn để tích lũy hoa hồng một cách dễ dàng và nhanh chóng nhất.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: '600' }}>
              Trang chuyển đổi link
            </Link>
            <Link href="/profile" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: '600', backgroundColor: 'white' }}>
              Thông tin cá nhân
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
