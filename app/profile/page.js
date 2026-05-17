'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Profile form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bankQr, setBankQr] = useState(null);
  const [existingQr, setExistingQr] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwStatus, setPwStatus] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setFullName(data.user.full_name || '');
        setPhone(data.user.phone || '');
        setExistingQr(data.user.bank_qr || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaveStatus('Đang lưu...');
    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('phone', phone);
      if (bankQr) {
        formData.append('bank_qr', bankQr);
      }
      formData.append('existing_bank_qr', existingQr);

      const res = await fetch('/api/profile', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setSaveStatus('Lưu thành công!');
        setExistingQr(data.bank_qr);
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus(data.error || 'Lỗi khi lưu.');
      }
    } catch (err) {
      setSaveStatus('Lỗi kết nối.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwStatus('');

    if (newPassword !== confirmNewPassword) {
      setPwStatus('error:Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setPwStatus('error:Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setPwStatus('ok:' + data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPwStatus(''), 4000);
      } else {
        setPwStatus('error:' + (data.error || 'Có lỗi xảy ra'));
      }
    } catch (err) {
      setPwStatus('error:Lỗi kết nối.');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) return <div className="main-container">Đang tải...</div>;
  if (!user) return <div className="main-container">Vui lòng đăng nhập.</div>;

  const pwStatusText = pwStatus.replace(/^(ok|error):/, '');
  const pwIsError = pwStatus.startsWith('error:');
  const pwIsOk = pwStatus.startsWith('ok:');

  return (
    <div className="main-container" style={{ alignItems: 'stretch', padding: '40px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Thông tin cá nhân</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Thông tin cơ bản
        </button>
        <button
          className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Đổi mật khẩu
        </button>
      </div>

      <div className="tab-content">
        {/* Tab: Thông tin cơ bản */}
        {activeTab === 'info' && (
          <div className="profile-section" style={{ maxWidth: '600px' }}>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập</label>
                <input type="text" className="form-input" value={user.username} disabled style={{ background: '#f8f9fa' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="text" className="form-input" value={user.email} disabled style={{ background: '#f8f9fa' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Họ và Tên</label>
                <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input type="text" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ảnh mã QR Ngân hàng</label>
                {existingQr && (
                  <div style={{ marginBottom: '10px' }}>
                    <img src={existingQr} alt="QR Code" style={{ maxWidth: '200px', border: '1px solid #ccc', borderRadius: '4px' }} />
                  </div>
                )}
                <input type="file" className="form-input" accept="image/*" onChange={e => setBankQr(e.target.files[0])} />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Lưu thay đổi</button>
              {saveStatus && (
                <span style={{ marginLeft: '16px', color: saveStatus.includes('Lỗi') ? 'red' : 'green' }}>
                  {saveStatus}
                </span>
              )}
            </form>
          </div>
        )}

        {/* Tab: Đổi mật khẩu */}
        {activeTab === 'password' && (
          <div className="profile-section" style={{ maxWidth: '500px' }}>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              {pwStatus && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    backgroundColor: pwIsError ? '#fde8e8' : '#e8f5e9',
                    color: pwIsError ? '#c62828' : '#2e7d32',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  {pwStatusText}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={pwLoading} style={{ marginTop: '4px' }}>
                {pwLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
