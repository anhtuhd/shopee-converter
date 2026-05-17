'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [link, setLink] = useState('');
  const [convertedLink, setConvertedLink] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch user on mount to use in conversion logic
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setUser(data.username);
      })
      .catch(() => {});
  }, []);

  const handleClear = () => {
    setLink('');
    setConvertedLink('');
    setProductInfo(null);
    setError('');
    setCopied(false);
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

    if (!link.startsWith('https://vn.shp.ee/') && !link.startsWith('https://s.shopee.vn/')) {
      setError('Link không hợp lệ. Vui lòng nhập link dạng https://vn.shp.ee/... hoặc https://s.shopee.vn/...');
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

      const affiliateId = user ? (data.affiliateId || '17399820370') : (data.guestAffiliateId || '17399820370');
      const subId = user || '';
      const encodedLink = encodeURIComponent(data.finalLink);

      const result = `https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=${affiliateId}&sub_id=${subId}&origin_link=${encodedLink}`;
      
      setConvertedLink(result);
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

  return (
    <div className="main-container">
      <h1 className="logo-text">
        <span style={{ color: '#4285f4' }}>S</span>
        <span style={{ color: '#ea4335' }}>h</span>
        <span style={{ color: '#fbbc05' }}>o</span>
        <span style={{ color: '#4285f4' }}>p</span>
        <span style={{ color: '#34a853' }}>e</span>
        <span style={{ color: '#ea4335' }}>e</span>
      </h1>
      
      <form onSubmit={handleConvert} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="search-box">
          <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ fill: '#9aa0a6', width: '20px', height: '20px', marginRight: '12px' }}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Nhập link shopee (vd: https://vn.shp.ee/...)" 
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          {link && (
            <button type="button" onClick={handleClear} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ fill: '#9aa0a6', width: '24px', height: '24px' }}>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
              </svg>
            </button>
          )}
        </div>
        
        {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

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
