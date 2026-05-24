'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Instructions() {
  const [commissionRate, setCommissionRate] = useState(0.50);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        if (data.user) {
          setCommissionRate(parseFloat(data.user.commission_rate) || 0.50);
          setIsLoggedIn(true);
        }
      })
      .catch(() => {
        setCommissionRate(0.50);
        setIsLoggedIn(false);
      });
  }, []);
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
      desc: (
        <span>
          Lưu ý cực kỳ quan trọng: Các sản phẩm được đặt mua có gắn tag{' '}
          <strong style={{ color: '#ea4335' }}>"Shopee Video"</strong> hoặc{' '}
          <strong style={{ color: '#ea4335' }}>"Shopee Live"</strong> sẽ{' '}
          <strong style={{ color: '#ea4335', textDecoration: 'underline' }}>KHÔNG ĐƯỢC</strong> ghi nhận hoa hồng hoàn tiền từ đối tác tiếp thị liên kết.
        </span>
      ),
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
      desc: (
        <span>
          Toàn bộ hoa hồng tích lũy hợp lệ của bạn sẽ được hệ thống tổng hợp đối soát và tự động chuyển khoản thanh toán vào ngày 15 hàng tháng qua tài khoản ngân hàng từ mã QR bạn cung cấp.
          <br />
          Mức hoàn tiền hiện tại của bạn là: <strong style={{ color: 'var(--primary-color)' }}>{(commissionRate * 100).toFixed(0)}%</strong> giá trị hoa hồng nhận từ đối tác tiếp thị liên kết (không phải giá trị tổng đơn hàng).
          <br />
          <strong style={{ color: '#1a73e8' }}>Lưu ý:</strong> Các đơn hàng mới mua sẽ được cập nhật tại tab Lịch sử đơn hàng vào ngày hôm sau.
        </span>
      ),
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: '#a8349d' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
      title: '5. Chương trình mời bạn bè & Nhận thưởng thụ động',
      desc: (
        <span>
          Mời bạn bè tham gia PiShare.site bằng cách chia sẻ <strong>Mã giới thiệu (chính là tên đăng nhập - username của bạn)</strong> hoặc gửi link giới thiệu cá nhân có dạng: 
          <br />
          <strong style={{ color: '#ea4335' }}>https://pishare.site/register?ref=username_cua_ban</strong>.
          <br />
          <strong style={{ color: '#137333' }}>Quyền lợi đặc biệt:</strong>
          <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
            <li>Bạn nhận được <strong>thưởng thêm 5% hoa hồng</strong> trích từ phần của hệ thống trên tất cả các đơn hàng hợp lệ của bạn bè trọn đời.</li>
            <li>Đồng thời, bạn được <strong>tặng thêm 5% hoa hồng cá nhân</strong> trong vòng <strong>30 ngày</strong> cho mỗi người giới thiệu thành công kể từ khi họ hoàn thành đơn hàng đầu tiên (đặc biệt: thời gian thưởng này được **cộng dồn tích lũy liên tục** nếu bạn giới thiệu nhiều người!).</li>
          </ul>
          Vào mục <Link href="/profile" style={{ color: '#1a73e8', textDecoration: 'underline', fontWeight: 'bold' }}>Giới thiệu bạn bè</Link> trong trang cá nhân để lấy link nhanh và theo dõi danh sách bạn bè đã mời!
        </span>
      ),
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

        {/* Commission Highlight Box */}
        <div style={{
          backgroundColor: '#f1f8e9',
          border: '1px solid #c5e1a5',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          textAlign: 'left'
        }}>
          <div style={{
            backgroundColor: '#8bc34a',
            color: 'white',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            %
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#33691e', marginBottom: '4px' }}>
              Tỷ lệ hoàn tiền của bạn: {(commissionRate * 100).toFixed(0)}% hoa hồng
            </h4>
            <p style={{ fontSize: '13px', color: '#558b2f', margin: 0, lineHeight: '1.5' }}>
              Hệ thống mặc định hoàn lại <strong>{(commissionRate * 100).toFixed(0)}% giá trị hoa hồng sản phẩm thực tế nhận được từ đối tác tiếp thị liên kết Shopee</strong> (không phải tổng giá trị thanh toán của đơn hàng). {isLoggedIn ? 'Tỷ lệ này áp dụng riêng cho tài khoản của bạn.' : 'Vui lòng đăng nhập để xem tỷ lệ chính xác cho tài khoản của bạn.'}
            </p>
          </div>
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
                <div style={{ fontSize: '14px', color: '#5f6368', lineHeight: '1.6' }}>
                  {step.desc}
                </div>
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

        {/* Contact Card */}
        <div style={{
          marginTop: '30px',
          padding: '24px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1px solid #dfe1e5',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#202124', marginBottom: '8px' }}>
            Bạn cần hỗ trợ hoặc kích hoạt tài khoản thủ công?
          </h4>
          <p style={{ fontSize: '13px', color: '#5f6368', marginBottom: '16px', lineHeight: '1.5' }}>
            Nếu bạn không nhận được email kích hoạt hoặc có bất kỳ câu hỏi nào về chu kỳ đối soát, tỷ lệ hoàn tiền, hãy liên hệ trực tiếp với Admin PiShare để được hỗ trợ tức thì:
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <a href="mailto:anhtuhd95@gmail.com" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1a73e8',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#f1f3f4',
              transition: 'background-color 0.2s'
            }}>
              ✉ Email: anhtuhd95@gmail.com
            </a>
            <a href="https://zalo.me/0397872462" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#137333',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#f1f3f4',
              transition: 'background-color 0.2s'
            }}>
              💬 Zalo: 0397872462
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
