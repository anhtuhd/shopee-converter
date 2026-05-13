'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

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
      }
    } catch (err) {
      setError('Có lỗi xảy ra, vui lòng thử lại.');
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
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-primary form-button">Đăng nhập</button>
        </form>
        <div className="form-footer">
          Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
