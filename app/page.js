'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [link, setLink] = useState('');
  const [convertedLink, setConvertedLink] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestMarqueeBonuses, setGuestMarqueeBonuses] = useState([]);
  const [marqueeSpeedDesktop, setMarqueeSpeedDesktop] = useState(12);
  const [marqueeSpeedMobile, setMarqueeSpeedMobile] = useState(8);
  const router = useRouter();

  useEffect(() => {
    // Fetch profile on mount to use in conversion logic and stats dashboard
    fetch('/api/profile')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        if (data.marquee_speed_desktop) {
          setMarqueeSpeedDesktop(parseInt(data.marquee_speed_desktop, 10) || 12);
        }
        if (data.marquee_speed_mobile) {
          setMarqueeSpeedMobile(parseInt(data.marquee_speed_mobile, 10) || 8);
        } else if (data.marquee_speed) {
          const legacy = parseInt(data.marquee_speed, 10) || 12;
          setMarqueeSpeedDesktop(legacy);
          setMarqueeSpeedMobile(Math.round(legacy * 0.7) || 8);
        }
        if (data.user) {
          setUser(data.user);
          setOrders(data.orders || []);
        } else {
          setUser(null);
          setOrders([]);
          if (data.guest_marquee_bonuses) {
            setGuestMarqueeBonuses(data.guest_marquee_bonuses);
          }
        }
      })
      .catch(() => {
        setUser(null);
        setOrders([]);
        setGuestMarqueeBonuses([]);
      });
  }, []);

  const handleClear = () => {
    setLink('');
    setConvertedLink('');
    setProductInfo(null);
    setError('');
    setCopied(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLink(text);
      setError('');
    } catch (err) {
      setError('Không thể tự động đọc clipboard. Bạn vui lòng cấp quyền truy cập hoặc tự dán bằng tay nhé.');
    }
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    setError('');
    setConvertedLink('');
    setProductInfo(null);
    setCopied(false);

    if (!link) {
      setError('Vui lòng nhập link.');
      return;
    }

    const trimmedLink = link.trim();
    if (
      !trimmedLink.startsWith('https://vn.shp.ee/') && 
      !trimmedLink.startsWith('https://s.shopee.vn/') && 
      !trimmedLink.startsWith('https://shopee.vn/') && 
      !trimmedLink.startsWith('https://shope.ee/')
    ) {
      setError('Link không hợp lệ. Vui lòng nhập link Shopee hợp lệ (ví dụ: https://vn.shp.ee/..., https://s.shopee.vn/..., hoặc https://shopee.vn/...)');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/resolve-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra khi phân tích link.');
        setLoading(false);
        return;
      }

      const affiliateId = user ? (user.custom_affiliate_id || data.affiliateId || '17399820370') : (data.guestAffiliateId || '17399820370');
      const subId = user ? user.username : '';
      
      let result;
      const isShortLink = data.finalLink.includes('s.shopee.vn') || 
                          data.finalLink.includes('shope.ee') || 
                          data.finalLink.includes('shp.ee') || 
                          data.finalLink.includes('vn.shp.ee');
                          
      if (isShortLink) {
        // Fallback an toàn: Sử dụng trực tiếp link rút gọn để tránh lỗi lồng nhau của Shopee Affiliate
        result = data.finalLink;
      } else {
        const encodedLink = encodeURIComponent(data.finalLink);
        result = `https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=${affiliateId}&sub_id=${subId}&origin_link=${encodedLink}`;
      }
      
      try {
        const shortenRes = await fetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ longUrl: result })
        });
        const shortenData = await shortenRes.json();
        
        if (shortenRes.ok && shortenData.shortUrl) {
          setConvertedLink(shortenData.shortUrl);
        } else {
          setConvertedLink(result);
        }
      } catch (shortenErr) {
        console.error('Lỗi khi rút gọn link, dùng link dài:', shortenErr);
        setConvertedLink(result);
      }
      
      setProductInfo(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối tới máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!convertedLink) return;

    // Robust copy function for cross-browser support
    const copyToClipboard = async (text) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (err) {
          console.error('navigator.clipboard error', err);
        }
      }

      // Fallback for older browsers or specific environments (like some versions of Safari)
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        console.error('execCommand error', err);
        document.body.removeChild(textArea);
        return false;
      }
    };

    copyToClipboard(convertedLink).then(success => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setError('Không thể copy link tự động. Vui lòng copy thủ công.');
      }
    });
  };

  const handleBuyNow = () => {
    window.open(convertedLink, '_blank');
  };

  // Calculate total pending and total paid
  const totalCompleted = orders.filter(o => o.status === 'Hoàn thành').reduce((acc, o) => acc + Number(o.user_commission || o.total_commission), 0);
  const totalPaid = orders.filter(o => o.status === 'Đã thanh toán').reduce((acc, o) => acc + Number(o.user_commission || o.total_commission), 0);

  // Get active marquee texts
  const getActiveMarqueeTexts = () => {
    if (user) {
      if (user.active_special_bonuses && user.active_special_bonuses.length > 0) {
        return user.active_special_bonuses
          .map(b => b.marquee_text)
          .filter(text => text && text.trim() !== '');
      } else if (user.active_special_bonus && user.active_special_bonus.marquee_text) {
        return [user.active_special_bonus.marquee_text];
      }
    } else {
      if (guestMarqueeBonuses && guestMarqueeBonuses.length > 0) {
        return guestMarqueeBonuses
          .map(b => b.marquee_text)
          .filter(text => text && text.trim() !== '');
      }
    }
    return [];
  };

  const marqueeTexts = getActiveMarqueeTexts();

  return (
    <div style={{ width: '100%' }}>
      {marqueeTexts.length > 0 && (
        <div className="special-marquee-bar" style={{
          width: '100%',
          background: '#f0f7ff', // Soft light matching blue background
          color: '#1a73e8',      // Premium blue Google text
          borderBottom: '1px solid #d2e3fc', // Subtle matching blue border
          padding: '8px 0',
          fontSize: '13px',
          fontWeight: '600',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <style>{`
            .marquee-content-custom {
              animation-duration: ${marqueeSpeedDesktop}s !important;
            }
            @media (max-width: 768px) {
              .marquee-content-custom {
                animation-duration: ${marqueeSpeedMobile}s !important;
              }
            }
          `}</style>
          <div className="marquee-content marquee-content-custom">
            {marqueeTexts.map((text, idx) => (
              <span key={idx}>
                🎉 {text} 🎉 {idx < marqueeTexts.length - 1 && <span style={{ margin: '0 24px', opacity: 0.5 }}>•</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="main-container" style={{ minHeight: 'calc(100vh - 110px)', paddingTop: '6vh' }}>

      <div className="home-brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', gap: '12px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '42px', 
          fontWeight: '800', 
          margin: '0',
          background: 'linear-gradient(135deg, #1a73e8, #34a853)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          letterSpacing: '-1.5px' 
        }}>
          PiShare
        </h1>
      </div>

      <form onSubmit={handleConvert} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="search-box">
          <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ fill: '#9aa0a6', width: '20px', height: '20px', marginRight: '12px' }}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Nhập link shopee (vd: https://vn.shp.ee/... hoặc https://shopee.vn/...)" 
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          {link ? (
            <button type="button" onClick={handleClear} title="Xóa" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
              <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ fill: '#9aa0a6', width: '24px', height: '24px' }}>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
              </svg>
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handlePaste} 
              title="Dán nhanh từ Clipboard" 
              style={{ 
                background: '#e8f0fe', 
                border: '1px solid #d2e3fc', 
                borderRadius: '50%', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                color: '#1a73e8',
                transition: 'all 0.2s ease',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(66, 133, 244, 0.15)',
                marginRight: '-4px',
                padding: '0'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d2e3fc';
                e.currentTarget.style.borderColor = '#1a73e8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#e8f0fe';
                e.currentTarget.style.borderColor = '#d2e3fc';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#1a73e8" style={{ width: '20px', height: '20px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          )}
        </div>

        {user && !user.bank_qr && (
          <div className="qr-warning-banner" style={{
            marginTop: '-18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#d93025',
            backgroundColor: '#fce8e6',
            padding: '10px 18px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: '500',
            border: '1px solid #fad2cf',
            maxWidth: '584px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <svg viewBox="0 0 24 24" style={{ fill: '#d93025', width: '18px', height: '18px', flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span style={{ textAlign: 'left' }}>
              <strong>Lưu ý:</strong> Bạn chưa cập nhật QR code ngân hàng. Hãy{' '}
              <a href="/profile" style={{ color: '#1a73e8', textDecoration: 'underline', fontWeight: 'bold' }}>
                cập nhật thông tin thanh toán
              </a>{' '}
              để được tự động nhận hoàn tiền vào ngày 15 hàng tháng.
            </span>
          </div>
        )}
        
        {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

        {user && (
          <div className="home-stats-bar" style={{ marginBottom: '10px' }}>
            {/* Stat 1: Total Orders */}
            <div className="home-stats-item" onClick={() => router.push('/history?tab=purchases')}>
              <svg viewBox="0 0 24 24" style={{ fill: 'currentColor', width: '16px', height: '16px' }}>
                <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z" />
              </svg>
              <span>Đơn hàng: <strong style={{ color: '#202124' }}>{orders.length}</strong></span>
            </div>

            <div className="home-stats-divider"></div>

            {/* Stat 2: Pending Refund */}
            <div className="home-stats-item pending" onClick={() => router.push('/history?tab=payments')}>
              <svg viewBox="0 0 24 24" style={{ fill: 'currentColor', width: '16px', height: '16px' }}>
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm3.3 11.5c0 2.2-1.9 2.5-3.3 2.5v1.5h-1.5V16H9v-1.5h3.5v-1H9.5c-2.2 0-2.5-1.9-2.5-3.3V9.5c0-2.2 1.9-2.5 3.3-2.5V5.5h1.5V7H15v1.5h-3.5v1h3c2.2 0 2.5 1.9 2.5 3.3v.7z" />
              </svg>
              <span>Đang xử lý: <strong style={{ color: '#202124' }}>{totalCompleted.toLocaleString('vi-VN')} đ</strong></span>
            </div>

            <div className="home-stats-divider"></div>

            {/* Stat 3: Paid Refund */}
            <div className="home-stats-item paid" onClick={() => router.push('/history?tab=payments')}>
              <svg viewBox="0 0 24 24" style={{ fill: 'currentColor', width: '16px', height: '16px' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>Đã nhận: <strong style={{ color: '#202124' }}>{totalPaid.toLocaleString('vi-VN')} đ</strong></span>
            </div>
          </div>
        )}

        <div>
          <button type="submit" className="btn-convert" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Chuyển đổi'}
          </button>
        </div>
      </form>

      {productInfo && (
        <div style={{ width: '100%', maxWidth: '584px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="preview-card" style={{ marginBottom: '16px', marginTop: '20px', width: '100%' }}>
            <div className="preview-image-container">
              {productInfo.image ? (
                <img src={productInfo.image} alt={productInfo.title} className="preview-image" />
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#ccc' }}>No Image</div>
              )}
            </div>
            <div className="preview-content">
              <div>
                <div className="preview-title">{productInfo.title}</div>
                <div className="preview-desc">{productInfo.description}</div>
              </div>
              <div className="preview-footer">
                <span className="preview-badge">Shopee Affiliate</span>
              </div>
            </div>
          </div>
          
          <div className="preview-actions" style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={handleCopy} style={{ flex: 1, padding: '12px 24px', fontSize: '16px', fontWeight: '500', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {copied ? 'Đã copy!' : 'Copy Link'}
            </button>
            <button className="btn-primary" onClick={handleBuyNow} style={{ flex: 1, padding: '12px 24px', fontSize: '16px', fontWeight: '500', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Mua ngay
            </button>
          </div>
        </div>
      )}

      {/* SEO and AI Search Optimization Section */}
      <section style={{
        marginTop: '56px',
        width: '100%',
        maxWidth: '800px',
        padding: '0 16px',
        boxSizing: 'border-box',
        textAlign: 'left'
      }}>
        <hr style={{ border: 'none', borderTop: '1px solid #dfe1e5', marginBottom: '40px' }} />
        
        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#202124',
          marginBottom: '12px',
          textAlign: 'center',
          letterSpacing: '-0.5px'
        }}>
          PiShare - Công Cụ Rút Gọn Link & Hoàn Tiền Shopee Uy Tín
        </h2>
        
        <p style={{
          fontSize: '15px',
          color: '#5f6368',
          lineHeight: '1.6',
          textAlign: 'center',
          marginBottom: '36px',
          maxWidth: '640px',
          margin: '0 auto 36px auto'
        }}>
          Hệ thống tối ưu giúp bạn chuyển đổi link Shopee Affiliate cá nhân, rút gọn link mua sắm nhanh chóng và nhận chiết khấu hoa hồng hấp dẫn lên đến 100% hoàn toàn tự động.
        </p>

        {/* Feature Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a73e8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Chuyển đổi siêu tốc
            </h3>
            <p style={{ fontSize: '13.5px', color: '#5f6368', lineHeight: '1.5', margin: 0 }}>
              Chỉ cần dán link Shopee, PiShare tự động chuyển đổi thành link affiliate chứa ID của bạn hoặc ID hệ thống ngay lập tức.
            </p>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#34a853', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💰 Hoàn tiền tự động
            </h3>
            <p style={{ fontSize: '13.5px', color: '#5f6368', lineHeight: '1.5', margin: 0 }}>
              Cơ chế đối soát thông minh giúp bạn nhận được phần lớn hoa hồng chiết khấu từ các đơn hàng Shopee đã mua qua link.
            </p>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fbbc05', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡️ An toàn & Minh bạch
            </h3>
            <p style={{ fontSize: '13.5px', color: '#5f6368', lineHeight: '1.5', margin: 0 }}>
              Lịch sử đơn hàng, hoa hồng tạm tính và trạng thái thanh toán được thống kê rõ ràng trực tiếp trên trang cá nhân của bạn.
            </p>
          </div>
        </div>

        {/* FAQ Accordion - AI Search Goldmine */}
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#202124', marginBottom: '24px' }}>
          Câu hỏi thường gặp (FAQ) & Hướng dẫn sử dụng
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#202124', marginBottom: '8px' }}>
              PiShare là gì? Hoạt động như thế nào?
            </h4>
            <p style={{ fontSize: '13.5px', color: '#5f6368', lineHeight: '1.6', margin: 0 }}>
              PiShare là dịch vụ web hỗ trợ chuyển đổi liên kết Shopee thông thường thành liên kết tiếp thị liên kết (Shopee Affiliate). Khi bạn hoặc người mua nhấp vào liên kết đã chuyển đổi và hoàn tất mua hàng trên Shopee, Shopee sẽ chi trả một khoản hoa hồng tiếp thị liên kết và PiShare sẽ tự động đối soát, cộng dồn phần hoa hồng này vào tài khoản của bạn để thanh toán lại định kỳ.
            </p>
          </div>

          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#202124', marginBottom: '8px' }}>
              Làm sao để tôi nhận được hoa hồng hoàn tiền từ Shopee?
            </h4>
            <p style={{ fontSize: '13.5px', color: '#5f6368', lineHeight: '1.6', margin: 0 }}>
              Rất đơn giản! Bạn chỉ cần đăng ký tài khoản tại PiShare, dán link sản phẩm Shopee muốn mua vào thanh công cụ tìm kiếm trên trang chủ để chuyển đổi link. Sau đó, sử dụng link kết quả để mua hàng. Đồng thời, hãy truy cập vào trang cá nhân để cập nhật Mã QR tài khoản ngân hàng của bạn. Số tiền hoa hồng tích lũy sẽ được chuyển khoản tự động đến bạn vào ngày 15 hàng tháng.
            </p>
          </div>

          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#202124', marginBottom: '8px' }}>
              Tôi có thể tự mua hàng qua link tiếp thị liên kết của mình để nhận chiết khấu không?
            </h4>
            <p style={{ fontSize: '13.5px', color: '#5f6368', lineHeight: '1.6', margin: 0 }}>
              Hoàn toàn được! Cơ chế của PiShare cho phép bạn tự tạo link và tự mua sắm để nhận hoa hồng hoàn tiền (tự mua hàng tiết kiệm). Đây là một giải pháp cực kỳ thông minh giúp bạn mua lẻ với mức giá sỉ ưu đãi nhờ nhận lại chiết khấu hoa hồng tiếp thị từ Shopee.
            </p>
          </div>

          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#202124', marginBottom: '8px' }}>
              Việc rút gọn link Shopee và nhận hoa hồng tại PiShare có an toàn không?
            </h4>
            <p style={{ fontSize: '13.5px', color: '#5f6368', lineHeight: '1.6', margin: 0 }}>
              Tuyệt đối an toàn và bảo mật. PiShare sử dụng dữ liệu đối soát chính thống từ hệ thống Shopee Affiliate thông qua khóa mã hóa SubID, giúp đảm bảo các giao dịch được ghi nhận chính xác 100%. Thông tin tài khoản ngân hàng và thông tin cá nhân của bạn cũng được bảo mật nghiêm ngặt.
            </p>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}
