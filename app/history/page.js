'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HistoryContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'purchases';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [referral, setReferral] = useState(null);
  const [referralCurrentPage, setReferralCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
        setOrders(data.orders || []);
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

  if (loading) return <div className="main-container">Đang tải...</div>;
  if (!user) return <div className="main-container">Vui lòng đăng nhập.</div>;

  // Split orders
  const purchaseOrders = orders; // All orders
  const paymentHistory = orders.filter(o => o.status === 'Đã thanh toán' || o.status === 'Hoàn thành');
  
  // Calculate total pending and total paid (fallbacks if referral state API hasn't resolved)
  const totalCompleted = orders.filter(o => o.status === 'Hoàn thành').reduce((acc, o) => acc + Number(o.user_commission || o.total_commission), 0);
  const totalPaid = orders.filter(o => o.status === 'Đã thanh toán').reduce((acc, o) => acc + Number(o.user_commission || o.total_commission), 0);

  const pendingPersonal = referral?.pendingPersonal !== undefined ? referral.pendingPersonal : totalCompleted;
  const pendingReferral = referral?.pendingReferral !== undefined ? referral.pendingReferral : 0;
  const pendingPayout = referral?.pendingPayout !== undefined ? referral.pendingPayout : (pendingPersonal + pendingReferral);

  const paidPersonal = referral?.paidPersonal !== undefined ? referral.paidPersonal : totalPaid;
  const paidReferral = referral?.paidReferral !== undefined ? referral.paidReferral : 0;
  const paidPayout = referral?.paidPayout !== undefined ? referral.paidPayout : (paidPersonal + paidReferral);

  return (
    <div className="main-container" style={{ alignItems: 'stretch', padding: '40px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Lịch sử Đơn hàng & Thanh toán</h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <button 
          className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchases')}
        >
          Lịch sử mua hàng
        </button>
        <button 
          className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          Hoa hồng giới thiệu
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Lịch sử thanh toán
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'purchases' && (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                  <th style={{ padding: '12px 8px' }}>Mã Đơn</th>
                  <th style={{ padding: '12px 8px' }}>Sản phẩm</th>
                  <th style={{ padding: '12px 8px' }}>Thời gian</th>
                  <th style={{ padding: '12px 8px' }}>Tổng tiền</th>
                  <th style={{ padding: '12px 8px' }}>Hoa hồng nhận</th>
                  <th style={{ padding: '12px 8px' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Chưa có đơn hàng nào.</td></tr>
                ) : (
                  purchaseOrders.map((order, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px' }}>{order.order_id}</td>
                      <td style={{ padding: '12px 8px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.item_name}>{order.item_name}</td>
                      <td style={{ padding: '12px 8px' }}>{new Date(order.order_time).toLocaleString('vi-VN')}</td>
                      <td style={{ padding: '12px 8px' }}>{Number(order.order_value).toLocaleString('vi-VN')} đ</td>
                      <td style={{ padding: '12px 8px', color: '#34a853', fontWeight: '500' }}>{Number(order.user_commission || order.total_commission).toLocaleString('vi-VN')} đ</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className={`status-badge status-${(order.status || '').toLowerCase().replace(/ /g, '-')}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'referrals' && referral && (() => {
          const referralOrdersList = referral.referralOrders || [];
          const referralItemsPerPage = 10;
          const totalReferralPages = Math.ceil(referralOrdersList.length / referralItemsPerPage) || 1;
          const activeReferralPage = Math.min(referralCurrentPage, totalReferralPages);
          const currentReferralOrders = referralOrdersList.slice(
            (activeReferralPage - 1) * referralItemsPerPage,
            activeReferralPage * referralItemsPerPage
          );

          return (
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Lịch sử đơn hàng giới thiệu thụ động</h3>
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                      <th style={{ padding: '12px 8px' }}>Mã Đơn</th>
                      <th style={{ padding: '12px 8px' }}>Người mua</th>
                      <th style={{ padding: '12px 8px' }}>Thời gian</th>
                      <th style={{ padding: '12px 8px' }}>Thưởng của bạn (5%)</th>
                      <th style={{ padding: '12px 8px' }}>Trạng thái đơn gốc</th>
                      <th style={{ padding: '12px 8px' }}>Trạng thái nhận tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReferralOrders.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Chưa có hoa hồng giới thiệu nào.</td></tr>
                    ) : (
                      currentReferralOrders.map((order, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: '500' }}>{order.order_id}</td>
                          <td style={{ padding: '12px 8px' }}>{order.purchaser}</td>
                          <td style={{ padding: '12px 8px' }}>{new Date(order.order_time).toLocaleString('vi-VN')}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#137333' }}>
                            +{parseFloat(order.referrer_commission).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className={`status-badge status-${(order.status || '').toLowerCase().replace(/ /g, '-')}`}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className={`status-badge status-${order.referrer_payout_status === 'Đã thanh toán' ? 'đã-thanh-toán' : 'đang-chờ-xử-lý'}`}>
                              {order.referrer_payout_status === 'Đã thanh toán' ? 'Đã nhận' : 'Đang chờ'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalReferralPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setReferralCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={activeReferralPage === 1}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Trang trước
                  </button>
                  <span style={{ fontSize: '14px' }}>Trang {activeReferralPage} / {totalReferralPages}</span>
                  <button
                    type="button"
                    onClick={() => setReferralCurrentPage(p => Math.min(p + 1, totalReferralPages))}
                    disabled={activeReferralPage === totalReferralPages}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', flex: '1 1 300px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ color: 'var(--secondary-text)', fontSize: '14px', marginBottom: '8px' }}>Hoa hồng chưa thanh toán (Đang chờ)</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea4335', marginBottom: '12px' }}>{pendingPayout.toLocaleString('vi-VN')} đ</div>
                <div style={{ borderTop: '1px dashed #eee', paddingTop: '8px', fontSize: '13px', color: '#5f6368' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Hoa hồng cá nhân (đơn Hoàn thành):</span>
                    <strong style={{ color: '#202124' }}>{pendingPersonal.toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Thưởng giới thiệu (đang chờ duyệt):</span>
                    <strong style={{ color: '#202124' }}>{pendingReferral.toLocaleString('vi-VN')} đ</strong>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--secondary-text)', marginTop: '8px', fontStyle: 'italic' }}>
                  Sẽ được Admin thanh toán hàng tháng vào ngày cố định.
                </div>
              </div>
              <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', flex: '1 1 300px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ color: 'var(--secondary-text)', fontSize: '14px', marginBottom: '8px' }}>Đã thanh toán thành công</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#34a853', marginBottom: '12px' }}>{paidPayout.toLocaleString('vi-VN')} đ</div>
                <div style={{ borderTop: '1px dashed #eee', paddingTop: '8px', fontSize: '13px', color: '#5f6368' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Hoa hồng cá nhân đã nhận:</span>
                    <strong style={{ color: '#202124' }}>{paidPersonal.toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Thưởng giới thiệu đã nhận:</span>
                    <strong style={{ color: '#202124' }}>{paidReferral.toLocaleString('vi-VN')} đ</strong>
                  </div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Chi tiết các đơn được ghi nhận</h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px' }}>Mã Đơn</th>
                    <th style={{ padding: '12px 8px' }}>Thời gian mua</th>
                    <th style={{ padding: '12px 8px' }}>Hoa hồng</th>
                    <th style={{ padding: '12px 8px' }}>Trạng thái thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>Chưa có đơn hàng nào hoàn thành.</td></tr>
                  ) : (
                    paymentHistory.map((order, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{order.order_id}</td>
                        <td style={{ padding: '12px 8px' }}>{new Date(order.order_time).toLocaleString('vi-VN')}</td>
                        <td style={{ padding: '12px 8px', color: '#34a853', fontWeight: '500' }}>+{Number(order.user_commission || order.total_commission).toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`status-badge status-${(order.status || '').toLowerCase().replace(/ /g, '-')}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function History() {
  return (
    <Suspense fallback={<div className="main-container">Đang tải...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
