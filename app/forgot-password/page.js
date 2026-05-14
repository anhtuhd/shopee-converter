'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: data.message });
        setEmail('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Đã có lỗi xảy ra' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Không thể kết nối đến máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container" style={{ paddingTop: '5vh' }}>
      <div className="form-container">
        <h2 className="form-title">Khôi phục mật khẩu</h2>
        <p style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '20px', textAlign: 'center' }}>
          Nhập địa chỉ email của bạn, chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email đã đăng ký</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@gmail.com"
            />
          </div>
          
          {status.message && (
            <div className={status.type === 'error' ? 'form-error' : ''} style={{ color: status.type === 'error' ? 'var(--error-color)' : '#34a853', fontSize: '14px', marginBottom: '15px', textAlign: 'center' }}>
              {status.message}
            </div>
          )}
          
          <button type="submit" className="btn-primary form-button" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi đường dẫn khôi phục'}
          </button>
        </form>
        
        <div className="form-footer">
          <Link href="/login">Quay lại Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
