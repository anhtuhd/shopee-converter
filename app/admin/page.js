'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [globalAffiliateId, setGlobalAffiliateId] = useState('');
  const [settingsStatus, setSettingsStatus] = useState('');

  // Users
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editCommission, setEditCommission] = useState('');
  
  // Orders
  const [orders, setOrders] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [csvStatus, setCsvStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  // Payouts
  const [payouts, setPayouts] = useState([]);
  const [cutoffDate, setCutoffDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
  });
  const [payoutStatus, setPayoutStatus] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterSubId, setFilterSubId] = useState('');
  const [filterStartOrder, setFilterStartOrder] = useState('');
  const [filterEndOrder, setFilterEndOrder] = useState('');
  const [filterStartCompleted, setFilterStartCompleted] = useState('');
  const [filterEndCompleted, setFilterEndCompleted] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const setRes = await fetch('/api/admin/settings');
      if (setRes.status === 403) {
        router.push('/');
        return;
      }
      const setData = await setRes.json();
      setGlobalAffiliateId(setData.global_affiliate_id || '');

      // Fetch users
      await fetchUsers();

      // Fetch orders
      await fetchOrders();
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const usrRes = await fetch('/api/admin/users');
    const usrData = await usrRes.json();
    setUsers(usrData.users || []);
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterOrderId) params.append('order_id', filterOrderId);
      if (filterSubId) params.append('sub_id', filterSubId);
      if (filterStartOrder) params.append('start_order_time', filterStartOrder);
      if (filterEndOrder) params.append('end_order_time', filterEndOrder);
      if (filterStartCompleted) params.append('start_completed_time', filterStartCompleted);
      if (filterEndCompleted) params.append('end_completed_time', filterEndCompleted);
      params.append('page', currentPage);

      const ordRes = await fetch('/api/admin/orders?' + params.toString());
      const ordData = await ordRes.json();
      setOrders(ordData.orders || []);
      setTotalPages(ordData.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayouts = async () => {
    try {
      setPayoutStatus('Đang tải dữ liệu...');
      const res = await fetch(`/api/admin/payouts?cutoffDate=${cutoffDate}`);
      const data = await res.json();
      if (res.ok) {
        setPayouts(data.payouts || []);
        setPayoutStatus('');
      } else {
        setPayoutStatus(data.error || 'Lỗi khi tải dữ liệu thanh toán');
      }
    } catch (err) {
      setPayoutStatus('Lỗi kết nối');
    }
  };

  useEffect(() => {
    if (activeTab === 'payouts') {
      fetchPayouts();
    }
  }, [activeTab, cutoffDate]);

  const clearFilters = () => {
    setFilterStatus('');
    setFilterOrderId('');
    setFilterSubId('');
    setFilterStartOrder('');
    setFilterEndOrder('');
    setFilterStartCompleted('');
    setFilterEndCompleted('');
    setCurrentPage(1);
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      setCurrentPage(1);
    }
  }, [filterStatus, filterOrderId, filterSubId, filterStartOrder, filterEndOrder, filterStartCompleted, filterEndCompleted, activeTab]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [currentPage, activeTab, filterStatus, filterOrderId, filterSubId, filterStartOrder, filterEndOrder, filterStartCompleted, filterEndCompleted]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSettingsStatus('Đang lưu...');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_affiliate_id: globalAffiliateId })
      });
      if (res.ok) {
        setSettingsStatus('Lưu thành công!');
        setTimeout(() => setSettingsStatus(''), 3000);
      } else {
        setSettingsStatus('Lỗi khi lưu.');
      }
    } catch (err) {
      setSettingsStatus('Lỗi kết nối.');
    }
  };

  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    setUploading(true);
    setCsvStatus('Đang xử lý...');
    
    try {
      const formData = new FormData();
      formData.append('csv_file', csvFile);

      const res = await fetch('/api/admin/csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setCsvStatus(data.message);
        await fetchOrders();
      } else {
        setCsvStatus(data.error || 'Lỗi khi upload.');
      }
    } catch (err) {
      setCsvStatus('Lỗi kết nối.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateCommission = async (user) => {
    const newRate = prompt(`Nhập tỷ lệ hoa hồng mới cho ${user.username} (Ví dụ: 0.8 cho 80%)`, user.commission_rate);
    if (newRate === null) return;
    
    const rateFloat = parseFloat(newRate);
    if (isNaN(rateFloat) || rateFloat < 0 || rateFloat > 10) {
      alert('Tỷ lệ không hợp lệ');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...user,
          commission_rate: rateFloat 
        })
      });
      if (res.ok) {
        alert('Cập nhật thành công');
        await fetchUsers();
      } else {
        alert('Lỗi khi cập nhật');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const handleMarkPaid = async (username) => {
    if (!confirm(`Xác nhận đã thanh toán cho user ${username}? Hệ thống sẽ đánh dấu tất cả các đơn 'Hoàn thành' trước ngày ${cutoffDate} là 'Đã thanh toán'.`)) return;
    
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, cutoffDate })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchPayouts();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const handlePayOrder = async (id) => {
    if (!confirm('Xác nhận thanh toán đơn hàng này?')) return;
    try {
      const res = await fetch('/api/admin/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [id] })
      });
      if (res.ok) {
        alert('Thanh toán thành công');
        await fetchOrders();
      } else {
        alert('Lỗi khi thanh toán');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  if (loading) return <div className="main-container">Đang tải...</div>;

  return (
    <div className="main-container" style={{ alignItems: 'stretch', padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#ea4335' }}>Admin Dashboard</h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Quản lý Users
        </button>
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Quản lý Đơn hàng
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          Tổng hợp Thanh toán
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Cài đặt hệ thống
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'users' && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Danh sách người dùng</h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px' }}>ID</th>
                    <th style={{ padding: '12px 8px' }}>Username</th>
                    <th style={{ padding: '12px 8px' }}>Họ Tên</th>
                    <th style={{ padding: '12px 8px' }}>Tỷ lệ hoa hồng</th>
                    <th style={{ padding: '12px 8px' }}>Quyền</th>
                    <th style={{ padding: '12px 8px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Chưa có dữ liệu.</td></tr>
                  ) : (
                    users.map((u, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{u.id}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{u.username}</td>
                        <td style={{ padding: '12px 8px' }}>{u.full_name}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{(u.commission_rate * 100).toFixed(0)}%</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`status-badge ${u.role === 'admin' ? 'status-hoàn-thành' : 'status-đã-hủy'}`}>{u.role}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <button onClick={() => handleUpdateCommission(u)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                            Sửa tỷ lệ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8f9fa' }}>
              <h3 style={{ marginBottom: '16px' }}>Upload CSV Cập nhật đơn hàng</h3>
              <form onSubmit={handleUploadCsv} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} />
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? 'Đang xử lý...' : 'Upload & Xử lý'}
                </button>
                {csvStatus && <span style={{ color: csvStatus.includes('Lỗi') ? 'red' : 'green' }}>{csvStatus}</span>}
              </form>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8f9fa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Bộ lọc tìm kiếm</h3>
                <button onClick={clearFilters} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Làm mới bộ lọc</button>
              </div>
              
              <div className="admin-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary-text)' }}>Trạng thái</label>
                  <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px' }}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="Đang chờ xử lý">Đang chờ xử lý</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Đã hủy">Đã hủy</option>
                    <option value="Đã thanh toán">Đã thanh toán</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary-text)' }}>Mã Đơn hàng</label>
                  <input type="text" className="form-input" value={filterOrderId} onChange={e => setFilterOrderId(e.target.value)} placeholder="Nhập mã đơn" style={{ padding: '8px 12px' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary-text)' }}>Username (Sub_id)</label>
                  <input type="text" className="form-input" value={filterSubId} onChange={e => setFilterSubId(e.target.value)} placeholder="Nhập username" style={{ padding: '8px 12px' }} />
                </div>
              </div>

              <div className="admin-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary-text)' }}>Khoảng thời gian đặt hàng</label>
                  <div className="date-range-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="date" className="form-input" value={filterStartOrder} onChange={e => setFilterStartOrder(e.target.value)} style={{ flex: 1, padding: '8px 12px' }} />
                    <span style={{ color: 'var(--secondary-text)' }}>đến</span>
                    <input type="date" className="form-input" value={filterEndOrder} onChange={e => setFilterEndOrder(e.target.value)} style={{ flex: 1, padding: '8px 12px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary-text)' }}>Khoảng thời gian hoàn thành</label>
                  <div className="date-range-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="date" className="form-input" value={filterStartCompleted} onChange={e => setFilterStartCompleted(e.target.value)} style={{ flex: 1, padding: '8px 12px' }} />
                    <span style={{ color: 'var(--secondary-text)' }}>đến</span>
                    <input type="date" className="form-input" value={filterEndCompleted} onChange={e => setFilterEndCompleted(e.target.value)} style={{ flex: 1, padding: '8px 12px' }} />
                  </div>
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: '16px' }}>Danh sách đơn hàng hệ thống</h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px' }}>Mã Đơn</th>
                    <th style={{ padding: '12px 8px' }}>Username</th>
                    <th style={{ padding: '12px 8px' }}>Thời gian</th>
                    <th style={{ padding: '12px 8px' }}>HH Shopee</th>
                    <th style={{ padding: '12px 8px' }}>HH User</th>
                    <th style={{ padding: '12px 8px' }}>Trạng thái</th>
                    <th style={{ padding: '12px 8px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center' }}>Chưa có đơn hàng nào.</td></tr>
                  ) : (
                    orders.map((o, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{o.order_id}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{o.sub_id1 || '-'}</td>
                        <td style={{ padding: '12px 8px' }}>{new Date(o.order_time).toLocaleString('vi-VN')}</td>
                        <td style={{ padding: '12px 8px', color: '#666', fontSize: '13px' }}>{Number(o.total_commission).toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '12px 8px', color: '#34a853', fontWeight: 'bold' }}>{Number(o.user_commission || 0).toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`status-badge status-${(o.status || '').toLowerCase().replace(/ /g, '-')}`}>{o.status}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {o.status === 'Hoàn thành' && (
                            <button onClick={() => handlePayOrder(o.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                              Thanh toán lẻ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '16px' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  className="btn-secondary"
                >
                  Trang trước
                </button>
                <span>Trang {currentPage} / {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payouts' && (
          <div>
            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8f9fa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ marginBottom: '8px' }}>Tổng hợp tiền cần trả</h3>
                  <p style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>Chỉ tính các đơn hàng có trạng thái <strong>'Hoàn thành'</strong> trước ngày chốt.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '600' }}>Ngày chốt:</label>
                  <input type="date" className="form-input" value={cutoffDate} onChange={e => setCutoffDate(e.target.value)} style={{ padding: '8px 12px' }} />
                </div>
              </div>
            </div>

            {payoutStatus && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-text)' }}>{payoutStatus}</div>}

            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px' }}>Username</th>
                    <th style={{ padding: '12px 8px' }}>Họ Tên</th>
                    <th style={{ padding: '12px 8px' }}>Thông tin Bank (QR)</th>
                    <th style={{ padding: '12px 8px' }}>Số đơn</th>
                    <th style={{ padding: '12px 8px' }}>Tổng tiền phải trả</th>
                    <th style={{ padding: '12px 8px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>Không có yêu cầu thanh toán nào trước ngày này.</td></tr>
                  ) : (
                    payouts.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{p.username}</td>
                        <td style={{ padding: '12px 8px' }}>{p.full_name || '-'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          {p.bank_qr ? (
                            <a href={p.bank_qr} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', fontSize: '12px' }}>Xem mã QR</a>
                          ) : (
                            <span style={{ color: '#ccc', fontSize: '12px' }}>Chưa có QR</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>{p.order_count} đơn</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#ea4335', fontSize: '18px' }}>
                          {Number(p.total_payout).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <button onClick={() => handleMarkPaid(p.username)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                            Đã thanh toán xong
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="profile-section" style={{ maxWidth: '600px' }}>
            <form onSubmit={handleUpdateSettings}>
              <div className="form-group">
                <label className="form-label">Global Affiliate ID</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={globalAffiliateId} 
                  onChange={e => setGlobalAffiliateId(e.target.value)} 
                  placeholder="Ví dụ: 17399820370"
                />
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                  ID này sẽ được gắn vào tất cả các link chuyển đổi của toàn bộ user.
                </span>
              </div>
              
              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Lưu cài đặt</button>
              {settingsStatus && <span style={{ marginLeft: '16px', color: settingsStatus.includes('Lỗi') ? 'red' : 'green' }}>{settingsStatus}</span>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
