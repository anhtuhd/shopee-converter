'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setDetails('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Đăng nhập thất bại');
        setDetails(data.details || '');
      }
    } catch (err) {
      setError(`Lỗi kết nối mạng: ${err.message}`);
    }
  };

  return (
    <div className="main-container" style={{ paddingTop: '5vh' }}>
      <div className="form-container">
        <h2 className="form-title">Đăng nhập</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập hoặc Email</label>
            <input 
              type="text" 
              className="form-input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Link href="/forgot-password" style={{ fontSize: '13px', color: 'var(--primary-color)', textDecoration: 'none' }}>
              Quên mật khẩu?
            </Link>
          </div>
          <button type="submit" className="btn-primary form-button">Đăng nhập</button>
        </form>
        <div className="form-footer">
          Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
