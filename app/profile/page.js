'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bankQr, setBankQr] = useState(null);
  const [existingQr, setExistingQr] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

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

  if (loading) return <div className="main-container">Đang tải...</div>;
  if (!user) return <div className="main-container">Vui lòng đăng nhập.</div>;

  return (
    <div className="main-container" style={{ alignItems: 'stretch', padding: '40px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Thông tin cá nhân</h2>

      <div className="tab-content">
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
            {saveStatus && <span style={{ marginLeft: '16px', color: saveStatus.includes('Lỗi') ? 'red' : 'green' }}>{saveStatus}</span>}
          </form>
        </div>
      </div>
    </div>
  );
}
