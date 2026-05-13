'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setUser({ username: data.username, role: data.role });
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    if (pathname !== '/') {
      router.push('/');
    } else {
      window.location.reload();
    }
  };

  return (
    <header>
      <nav className="nav-links">
        <Link href="/" className="nav-link">Trang chủ</Link>
        {user ? (
          <>
            <Link href="/profile" className="nav-link">Thông tin cá nhân</Link>
            <Link href="/history" className="nav-link">Lịch sử đơn hàng</Link>
            {user.role === 'admin' && (
              <Link href="/admin" className="nav-link" style={{ color: '#ea4335', fontWeight: 'bold' }}>Admin Panel</Link>
            )}
            <span style={{ fontSize: '14px', marginRight: '16px', marginLeft: 'auto' }}>
              Xin chào, <strong>{user.username}</strong>
            </span>
            <button onClick={handleLogout} className="btn-secondary">Đăng xuất</button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-secondary">Đăng nhập</Link>
            <Link href="/register" className="btn-primary">Đăng ký</Link>
          </>
        )}
      </nav>
    </header>
  );
}
