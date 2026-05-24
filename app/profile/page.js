'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [referral, setReferral] = useState(null);
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
      if (data.referral) {
        setReferral(data.referral);
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
        <button
          className={`tab-btn ${activeTab === 'referral' ? 'active' : ''}`}
          onClick={() => setActiveTab('referral')}
        >
          Giới thiệu bạn bè
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

        {/* Tab: Giới thiệu bạn bè */}
        {activeTab === 'referral' && referral && (
          <div className="profile-section" style={{ width: '100%' }}>
            {/* Box chia sẻ link và mã giới thiệu */}
            <div style={{
              background: '#e8f0fe',
              border: '1px solid #d2e3fc',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '30px',
              boxShadow: '0 2px 8px rgba(66, 133, 244, 0.1)'
            }}>
              <h3 style={{ color: '#1a73e8', fontSize: '18px', margin: '0 0 12px 0', fontWeight: '700' }}>Chương trình giới thiệu bạn bè</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#5f6368', lineHeight: '1.5' }}>
                Mời bạn bè tham gia <strong>PiShare.site</strong> để cùng nhau kiếm tiền! Bạn sẽ nhận được <strong>thưởng thêm 5% hoa hồng</strong> trích từ phần của hệ thống trên mỗi đơn hàng hợp lệ của bạn bè (người được giới thiệu hoàn toàn không bị ảnh hưởng). 
                Đồng thời, bạn cũng sẽ được <strong>cộng thêm 5% hoa hồng cá nhân</strong> trong vòng 30 ngày kể từ khi bạn bè hoàn thành đơn hàng đầu tiên.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #dfe1e5' }}>
                  <span style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Username (Mã giới thiệu của bạn)</span>
                  <strong style={{ fontSize: '20px', color: '#ea4335', letterSpacing: '0.5px' }}>{user.username}</strong>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #dfe1e5' }}>
                  <span style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Link giới thiệu trực tiếp</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      readOnly 
                      value={`https://pishare.site/register?ref=${user.username}`} 
                      style={{ fontSize: '12px', padding: '6px 10px', height: '32px', flexGrow: 1, background: '#f1f3f4' }} 
                    />
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '12px', height: '32px', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={(e) => {
                        const linkStr = `https://pishare.site/register?ref=${user.username}`;
                        navigator.clipboard.writeText(linkStr);
                        e.currentTarget.innerText = 'Đã copy!';
                        const btn = e.currentTarget;
                        setTimeout(() => { btn.innerText = 'Copy Link'; }, 2000);
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Các Card Thống Kê */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #dfe1e5', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '13px', color: '#5f6368', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Bạn bè đã mời</span>
                <strong style={{ fontSize: '28px', color: '#202124' }}>{referral.referredCount}</strong> <span style={{ color: '#5f6368', fontSize: '14px' }}>thành viên</span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #dfe1e5', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '13px', color: '#5f6368', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Hoa hồng giới thiệu đã nhận</span>
                <strong style={{ fontSize: '28px', color: '#137333' }}>{referral.referralEarnings.toLocaleString('vi-VN')}</strong> <span style={{ color: '#137333', fontSize: '14px', fontWeight: 'bold' }}>đ</span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #dfe1e5', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '13px', color: '#5f6368', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tiền thụ động đang chờ duyệt</span>
                <strong style={{ fontSize: '28px', color: '#b06000' }}>
                  {(referral.referralOrders?.filter(o => o.status === 'Hoàn thành' && o.referrer_payout_status === 'Đang chờ').reduce((acc, o) => acc + parseFloat(o.referrer_commission || 0), 0) || 0).toLocaleString('vi-VN')}
                </strong> <span style={{ color: '#b06000', fontSize: '14px', fontWeight: 'bold' }}>đ</span>
              </div>
            </div>

            {/* Danh sách bạn bè đã mời */}
            <h4 style={{ fontSize: '16px', margin: '0 0 12px 0', fontWeight: '700', color: '#202124' }}>Thành viên đã giới thiệu</h4>
            {referral.referredUsers && referral.referredUsers.length > 0 ? (
              <div className="table-container" style={{ overflowX: 'auto', marginBottom: '30px', border: '1px solid #dfe1e5', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dfe1e5' }}>
                      <th style={{ padding: '12px 16px', color: '#5f6368', fontWeight: '600' }}>Tên đăng nhập</th>
                      <th style={{ padding: '12px 16px', color: '#5f6368', fontWeight: '600' }}>Họ và tên</th>
                      <th style={{ padding: '12px 16px', color: '#5f6368', fontWeight: '600' }}>Ngày tham gia</th>
                      <th style={{ padding: '12px 16px', color: '#5f6368', fontWeight: '600' }}>Ngày đơn đầu hoàn thành</th>
                      <th style={{ padding: '12px 16px', color: '#5f6368', fontWeight: '600' }}>Thời hạn thưởng (+5% cá nhân)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referral.referredUsers.map((refUser) => {
                      const signupDate = new Date(refUser.created_at).toLocaleDateString('vi-VN');
                      const firstOrderDate = refUser.first_order_completed_at ? new Date(refUser.first_order_completed_at) : null;
                      const expiryDate = firstOrderDate ? new Date(firstOrderDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
                      const now = new Date();
                      const isActive = expiryDate ? (now <= expiryDate) : false;

                      return (
                        <tr key={refUser.id} style={{ borderBottom: '1px solid #dfe1e5' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '500' }}>{refUser.username}</td>
                          <td style={{ padding: '12px 16px' }}>{refUser.full_name || '--'}</td>
                          <td style={{ padding: '12px 16px', color: '#5f6368' }}>{signupDate}</td>
                          <td style={{ padding: '12px 16px', color: '#5f6368' }}>
                            {firstOrderDate ? firstOrderDate.toLocaleDateString('vi-VN') : 'Chưa phát sinh'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {expiryDate ? (
                              isActive ? (
                                <span style={{ color: 'green', fontWeight: '600' }}>
                                  Còn hạn (đến {expiryDate.toLocaleDateString('vi-VN')})
                                </span>
                              ) : (
                                <span style={{ color: '#5f6368' }}>
                                  Hết hạn ({expiryDate.toLocaleDateString('vi-VN')})
                                </span>
                              )
                            ) : (
                              <span style={{ color: '#b06000' }}>Đang chờ kích hoạt</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9aa0a6', border: '1px dashed #dfe1e5', borderRadius: '8px', marginBottom: '30px' }}>
                Bạn chưa giới thiệu thành viên nào. Hãy chia sẻ đường dẫn giới thiệu để bắt đầu nhận thu nhập thụ động!
              </div>
            )}

            {/* Liên kết sang Lịch sử để xem chi tiết */}
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #dfe1e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#202124', display: 'block', marginBottom: '4px' }}>Theo dõi lịch sử đơn hàng giới thiệu</strong>
                <span style={{ fontSize: '13px', color: '#5f6368' }}>Tất cả chi tiết đơn hàng thụ động, trạng thái đơn gốc và tiến độ thanh toán đã được di dời sang mục Lịch sử.</span>
              </div>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ padding: '10px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}
                onClick={() => router.push('/history?tab=referrals')}
              >
                Xem chi tiết tại đây
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
