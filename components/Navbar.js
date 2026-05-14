'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
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

  const NavLinks = () => (
    <>
      <Link href="/" className="nav-link">Trang chủ</Link>
      {user && (
        <>
          <Link href="/profile" className="nav-link">Thông tin cá nhân</Link>
          <Link href="/history" className="nav-link">Lịch sử đơn hàng</Link>
          {user.role === 'admin' && (
            <Link href="/admin" className="nav-link" style={{ color: '#ea4335', fontWeight: 'bold' }}>Admin Panel</Link>
          )}
        </>
      )}
    </>
  );

  const AuthLinks = () => (
    <>
      {user ? (
        <>
          <span className="user-greeting" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            Xin chào, <strong>{user.username}</strong>
          </span>
          <button onClick={handleLogout} className="btn-secondary logout-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Đăng xuất</button>
        </>
      ) : (
        <>
          <Link href="/login" className="btn-secondary login-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Đăng nhập</Link>
          <Link href="/register" className="btn-primary register-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Đăng ký</Link>
        </>
      )}
    </>
  );

  return (
    <header className="main-header">
      {/* Mobile Hamburger Button */}
      <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
        <svg focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
        </svg>
      </button>

      {/* Mobile Auth Container (Visible only on mobile) */}
      <div className="mobile-auth-container">
        <AuthLinks />
      </div>

      {/* Desktop Navigation */}
      <nav className="nav-links desktop-nav">
        <NavLinks />
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <AuthLinks />
        </span>
      </nav>

      {/* Mobile Side Menu (Slides from Left) */}
      <div className={`mobile-side-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
        <nav className="mobile-menu-content">
          <button className="close-menu-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <svg focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
            </svg>
          </button>
          <div className="mobile-nav-items">
            <NavLinks />
          </div>
        </nav>
      </div>
    </header>
  );
}
