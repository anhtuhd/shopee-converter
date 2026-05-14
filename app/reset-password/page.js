'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: data.message });
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Đã có lỗi xảy ra' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Không thể kết nối đến máy chủ.' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="main-container" style={{ paddingTop: '5vh' }}>
        <div className="form-container">
          <h2 className="form-title">Đường dẫn không hợp lệ</h2>
          <p style={{ textAlign: 'center', marginBottom: '20px' }}>Không tìm thấy mã xác thực. Vui lòng quay lại trang quên mật khẩu.</p>
          <div className="form-footer">
            <Link href="/forgot-password" style={{ display: 'inline-block', background: 'var(--primary-color)', color: 'white', padding: '10px 20px', borderRadius: '4px' }}>
              Trở về
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container" style={{ paddingTop: '5vh' }}>
      <div className="form-container">
        <h2 className="form-title">Đặt lại mật khẩu mới</h2>
        
        {status.type === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#34a853', fontSize: '16px', marginBottom: '20px' }}>{status.message}</div>
            <p style={{ fontSize: '14px', color: 'var(--secondary-text)' }}>Đang tự động chuyển hướng về trang Đăng nhập...</p>
            <div className="form-footer" style={{ marginTop: '30px' }}>
              <Link href="/login" className="btn-primary" style={{ padding: '10px 20px' }}>Đăng nhập ngay</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <input 
                type="password" 
                className="form-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Ít nhất 6 ký tự"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu mới</label>
              <input 
                type="password" 
                className="form-input" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            
            {status.message && (
              <div className="form-error" style={{ marginBottom: '15px', textAlign: 'center' }}>
                {status.message}
              </div>
            )}
            
            <button type="submit" className="btn-primary form-button" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="main-container">Đang tải...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
