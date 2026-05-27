'use client';

import Link from 'next/link';

export default function Instructions() {
  const steps = [
    {
      title: 'Bước 1: Tạo tài khoản và Đăng nhập',
      desc: 'Truy cập vào trang web Pishare.site. Nếu chưa có tài khoản, hãy bấm Đăng ký ngay, sau đó tiến hành Đăng nhập vào hệ thống.',
      imgSrcs: ['/step1.png']
    },
    {
      title: 'Bước 2: Chọn sản phẩm trên Shopee',
      desc: 'Mở ứng dụng Shopee trên điện thoại của bạn và tìm kiếm sản phẩm mà bạn đang có nhu cầu muốn mua.',
      imgSrcs: ['/step3_1.png']
    },
    {
      title: 'Bước 3: Sao chép đường dẫn (Link) sản phẩm',
      desc: 'Tại giao diện sản phẩm Shopee, bấm vào biểu tượng Chia sẻ (hình mũi tên ở góc trên bên phải) ➡️ Chọn Sao chép đường dẫn. Sau đó quay lại trình duyệt web PiShare.',
      imgSrcs: ['/step3_2.png']
    },
    {
      title: 'Bước 4: Dán link và Chuyển đổi',
      desc: 'Tại thanh tìm kiếm của PiShare, hãy Dán link sản phẩm bạn vừa copy vào ➡️ Bấm nút Chuyển đổi.',
      imgSrcs: ['/step4.png']
    },
    {
      title: 'Bước 5: Nhấn Mua ngay',
      desc: 'Hệ thống sẽ xử lý link trong giây lát. Khi giao diện hiện ra thông tin, bạn chỉ cần bấm vào nút Mua ngay ở phía dưới màn hình.',
      imgSrcs: ['/step5.png']
    },
    {
      title: 'Bước 6: Nếu link không chuyển hướng sang Ứng dụng Shopee',
      desc: 'Khi giao diện Shopee trên trình duyệt hiện ra, bạn bấm vào biểu tượng 3 dấu gạch ngang (ở góc dưới cùng bên phải của trình duyệt Cốc Cốc/Chrome) ➡️ Chọn Mở bằng ứng dụng "Shopee".',
      imgSrcs: ['/step6.png']
    }
  ];

  return (
    <div className="main-container" style={{ paddingTop: '40px', paddingBottom: '80px', minHeight: '100vh', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
      <div style={{ maxWidth: '900px', width: '100%', padding: '0 16px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#202124', marginBottom: '14px', letterSpacing: '-0.8px' }}>
            Hướng dẫn các bước mua hàng Hoàn tiền
          </h1>
          <p style={{ fontSize: '17px', color: '#5f6368', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6' }}>
            Hãy thực hiện theo 6 bước cực kỳ đơn giản dưới đây để mua sắm trên Shopee thông qua PiShare và nhận hoàn tiền tự động lên tới 50% hoa hồng!
          </p>
        </div>

        {/* Steps Roadmaps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {steps.map((step, idx) => {
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  backgroundColor: 'white',
                  borderRadius: '24px',
                  border: '1px solid #dfe1e5',
                  padding: '30px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  transition: 'transform 0.3s ease',
                }}
              >
                {/* Text and mockup grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr', 
                  gap: '30px',
                  alignItems: 'center',
                }}
                className="instruction-step-grid"
                >
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ 
                      fontSize: '20px', 
                      fontWeight: '800', 
                      color: '#202124', 
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {step.title}
                    </h3>
                    <p style={{ 
                      fontSize: '15px', 
                      color: '#4a4a4a', 
                      lineHeight: '1.65',
                      margin: 0
                    }}>
                      {step.desc}
                    </p>
                  </div>

                  {/* Phone Mockup Frame containing Custom React Rendered Mockup UI or Images */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {step.imgSrcs ? (
                      step.imgSrcs.map((src, i) => (
                        <div 
                          key={i}
                          style={{
                            position: 'relative',
                            maxWidth: '240px',
                            width: '100%',
                            borderRadius: '32px',
                            padding: '16px 12px',
                            background: '#1a1a1a', // Dark smartphone body
                            boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                            border: '1px solid #2d2d2d',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Dynamic Island / Notch */}
                          <div style={{
                            width: '60px',
                            height: '12px',
                            background: '#000',
                            borderRadius: '10px',
                            margin: '0 auto 16px auto',
                            position: 'relative'
                          }}></div>
                          
                          {/* Viewport container */}
                          <div style={{
                            width: '100%',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            background: '#f8f9fa',
                            boxSizing: 'border-box',
                            display: 'block',
                            border: '1px solid #eee'
                          }}>
                            <img 
                              src={src} 
                              alt={`${step.title} - ảnh ${i + 1}`}
                              style={{
                                width: '100%',
                                display: 'block',
                                height: 'auto',
                                maxHeight: '340px',
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{
                        position: 'relative',
                        maxWidth: '240px',
                        width: '100%',
                        borderRadius: '32px',
                        padding: '16px 12px',
                        background: '#1a1a1a',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                        border: '1px solid #2d2d2d',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{
                          width: '60px',
                          height: '12px',
                          background: '#000',
                          borderRadius: '10px',
                          margin: '0 auto 16px auto',
                          position: 'relative'
                        }}></div>
                        
                        <div style={{
                          width: '100%',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          background: '#f8f9fa',
                          padding: '24px 8px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '220px',
                          border: '1px solid #eee'
                        }}>
                          {step.renderMockup()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: '#e8f0fe', 
          borderRadius: '24px', 
          border: '1px solid #c3ecf6',
          marginTop: '60px'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1967d2', marginBottom: '10px' }}>
            Bạn đã sẵn sàng để mua sắm thông minh chưa?
          </h3>
          <p style={{ fontSize: '15px', color: '#1967d2', marginBottom: '24px', opacity: 0.9 }}>
            Chuyển đổi liên kết Shopee ngay bây giờ và nhận hoàn tiền hoa hồng tự động cực kỳ hấp dẫn!
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: '600', padding: '12px 28px' }}>
              Bắt đầu chuyển đổi link ➡️
            </Link>
            <Link href="/notes" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: '600', backgroundColor: 'white', padding: '12px 28px' }}>
              Xem Lưu ý Quan Trọng ⚠️
            </Link>
          </div>
        </div>
      </div>
      
      {/* Small inline responsive style */}
      <style jsx global>{`
        @media (min-width: 768px) {
          .instruction-step-grid {
            grid-template-columns: 1.2fr 0.8fr !important;
          }
        }
      `}</style>
    </div>
  );
}
