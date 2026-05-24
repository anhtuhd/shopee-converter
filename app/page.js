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
  const router = useRouter();

  useEffect(() => {
    // Fetch profile on mount to use in conversion logic and stats dashboard
    fetch('/api/profile')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setOrders(data.orders || []);
        }
      })
      .catch(() => {
        setUser(null);
        setOrders([]);
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
      const encodedLink = encodeURIComponent(data.finalLink);

      const result = `https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=${affiliateId}&sub_id=${subId}&origin_link=${encodedLink}`;
      
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

  return (
    <div className="main-container">

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
    </div>
  );
}
