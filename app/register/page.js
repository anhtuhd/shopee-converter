'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setDetails('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/login');
      } else {
        setError(data.error || 'Đăng ký thất bại');
        setDetails(data.details || '');
      }
    } catch (err) {
      setError(`Lỗi kết nối mạng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container" style={{ paddingTop: '5vh' }}>
      <div className="form-container">
        <h2 className="form-title">Tạo tài khoản</h2>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Email <span style={{color: 'red'}}>*</span></label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập (Tùy chọn)</label>
            <input 
              type="text" 
              className="form-input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu <span style={{color: 'red'}}>*</span></label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu <span style={{color: 'red'}}>*</span></label>
            <input 
              type="password" 
              className="form-input" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="form-error" style={{ wordBreak: 'break-word', textAlign: 'left' }}>
              <div>{error}</div>
              {details && (
                <details style={{ marginTop: '10px', fontSize: '12px', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Chi tiết lỗi hệ thống (Click để xem)</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: '5px', overflowX: 'auto', maxHeight: '200px' }}>{details}</pre>
                </details>
              )}
            </div>
          )}
          <button type="submit" className="btn-primary form-button" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>
        <div className="form-footer">
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
