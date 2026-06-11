'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [globalAffiliateId, setGlobalAffiliateId] = useState('');
  const [guestAffiliateId, setGuestAffiliateId] = useState('');
  const [marqueeSpeedDesktop, setMarqueeSpeedDesktop] = useState('12');
  const [marqueeSpeedMobile, setMarqueeSpeedMobile] = useState('8');
  const [settingsStatus, setSettingsStatus] = useState('');

  // Users
  const [users, setUsers] = useState([]);
  const [allUsersForBonus, setAllUsersForBonus] = useState([]);
  const [showForGuests, setShowForGuests] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editCommission, setEditCommission] = useState('');
  const [editCustomAffiliateId, setEditCustomAffiliateId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);

  // Special Bonuses
  const [bonuses, setBonuses] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bonusRate, setBonusRate] = useState('');
  const [bonusStart, setBonusStart] = useState('');
  const [bonusEnd, setBonusEnd] = useState('');
  const [bonusDesc, setBonusDesc] = useState('');
  const [bonusMarquee, setBonusMarquee] = useState('');
  const [autoApplyNewUsers, setAutoApplyNewUsers] = useState(false);
  const [addingBonus, setAddingBonus] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  
  // Bonuses paging and search
  const [bonusSearchTerm, setBonusSearchTerm] = useState('');
  const [bonusCurrentPage, setBonusCurrentPage] = useState(1);
  const [selectedBonusIds, setSelectedBonusIds] = useState([]);
  
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
  
  // Bills History
  const [bills, setBills] = useState([]);
  const [billsStatus, setBillsStatus] = useState('');

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
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  // Financials states
  const [financialsData, setFinancialsData] = useState(null);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [financialFilterRange, setFinancialFilterRange] = useState('30days');
  const [financialStartDate, setFinancialStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [financialEndDate, setFinancialEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('Server');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

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
      setGuestAffiliateId(setData.guest_affiliate_id || '');
      setMarqueeSpeedDesktop(setData.marquee_speed_desktop || '12');
      setMarqueeSpeedMobile(setData.marquee_speed_mobile || '8');

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

  const fetchUsers = async (page = usersCurrentPage) => {
    try {
      const usrRes = await fetch(`/api/admin/users?page=${page}`);
      const usrData = await usrRes.json();
      setUsers(usrData.users || []);
      setUsersTotalPages(usrData.totalPages || 1);
      setUsersCurrentPage(usrData.page || page);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinancials = async () => {
    setFinancialsLoading(true);
    try {
      const res = await fetch(`/api/admin/financials?startDate=${financialStartDate}&endDate=${financialEndDate}`);
      if (res.status === 403) {
        router.push('/');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFinancialsData(data);
      } else {
        alert('Lỗi tải báo cáo tài chính');
      }
    } catch (err) {
      console.error('Lỗi tải báo cáo tài chính:', err);
    } finally {
      setFinancialsLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const body = {
        type: transactionType,
        amount: parseFloat(transactionAmount),
        category: transactionCategory,
        description: transactionDescription,
        transaction_date: transactionDate
      };
      
      let url = '/api/admin/financials';
      let method = 'POST';
      
      if (editingTransaction) {
        body.id = editingTransaction.id;
        method = 'PUT';
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setShowAddTransactionModal(false);
        setEditingTransaction(null);
        setTransactionAmount('');
        setTransactionDescription('');
        fetchFinancials();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi ghi nhận giao dịch');
      }
    } catch (err) {
      console.error('Lỗi khi lưu giao dịch:', err);
      alert('Lỗi kết nối');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
    try {
      const res = await fetch(`/api/admin/financials?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchFinancials();
      } else {
        alert('Lỗi khi xóa giao dịch');
      }
    } catch (err) {
      console.error('Lỗi khi xóa giao dịch:', err);
    }
  };

  const handleStartEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setTransactionType(tx.type);
    setTransactionAmount(tx.amount.toString());
    setTransactionCategory(tx.category);
    setTransactionDescription(tx.description);
    setTransactionDate(tx.transaction_date);
    setShowAddTransactionModal(true);
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

  const fetchBills = async () => {
    try {
      setBillsStatus('Đang tải lịch sử thanh toán...');
      const res = await fetch('/api/admin/payouts?type=bills');
      const data = await res.json();
      if (res.ok) {
        setBills(data.bills || []);
        setBillsStatus('');
      } else {
        setBillsStatus(data.error || 'Lỗi khi tải lịch sử thanh toán');
      }
    } catch (err) {
      setBillsStatus('Lỗi kết nối');
    }
  };

  useEffect(() => {
    if (activeTab === 'payouts') {
      fetchPayouts();
    } else if (activeTab === 'bonuses') {
      fetchBonuses();
      fetchAllUsersForBonus();
    } else if (activeTab === 'bills') {
      fetchBills();
    }
  }, [activeTab, cutoffDate]);

  const fetchAllUsersForBonus = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=all');
      const data = await res.json();
      if (res.ok) {
        setAllUsersForBonus(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching all users for bonus:', err);
    }
  };

  const fetchBonuses = async () => {
    try {
      const res = await fetch('/api/admin/bonuses');
      const data = await res.json();
      if (res.ok) {
        setBonuses(data.bonuses || []);
      }
    } catch (err) {
      console.error('Error fetching bonuses:', err);
    }
  };

  const handleSelectAllUsers = () => {
    const filteredUsers = allUsersForBonus.filter(u => 
      u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()))
    );
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleClearUserSelection = () => {
    if (!userSearchTerm) {
      setSelectedUserIds([]);
    } else {
      const filteredUsers = allUsersForBonus.filter(u => 
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()))
      );
      const filteredIds = filteredUsers.map(u => u.id);
      setSelectedUserIds(prev => prev.filter(id => !filteredIds.includes(id)));
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handleDateClick = (dayStr) => {
    if (!bonusStart || (bonusStart && bonusEnd)) {
      setBonusStart(dayStr);
      setBonusEnd('');
    } else {
      if (dayStr < bonusStart) {
        setBonusStart(dayStr);
      } else {
        setBonusEnd(dayStr);
        setShowCalendarDropdown(false); // Close calendar popover on range completion
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    const prevMonth = () => {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(prev => prev - 1);
      } else {
        setCalendarMonth(prev => prev - 1);
      }
    };

    const nextMonth = () => {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(prev => prev + 1);
      } else {
        setCalendarMonth(prev => prev + 1);
      }
    };

    const days = [];
    // Blank days for start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: '8px', textAlign: 'center' }}></div>);
    }

    // Days in month
    for (let d = 1; d <= daysInMonth; d++) {
      const currentMonthStr = String(calendarMonth + 1).padStart(2, '0');
      const currentDayStr = String(d).padStart(2, '0');
      const dayStr = `${calendarYear}-${currentMonthStr}-${currentDayStr}`;

      const isStart = bonusStart === dayStr;
      const isEnd = bonusEnd === dayStr;
      const isInRange = bonusStart && bonusEnd && dayStr > bonusStart && dayStr < bonusEnd;

      let cellStyle = {
        padding: '8px',
        textAlign: 'center',
        cursor: 'pointer',
        borderRadius: '50%',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        margin: 'auto'
      };

      if (isStart || isEnd) {
        cellStyle.background = 'var(--primary-color)';
        cellStyle.color = 'white';
        cellStyle.fontWeight = 'bold';
        cellStyle.borderRadius = '50%';
      } else if (isInRange) {
        cellStyle.background = '#e8f0fe';
        cellStyle.color = '#1a73e8';
        cellStyle.borderRadius = '0';
      }

      days.push(
        <div 
          key={dayStr} 
          onClick={() => handleDateClick(dayStr)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            style={cellStyle}
            onMouseEnter={(e) => {
              if (!isStart && !isEnd && !isInRange) {
                e.currentTarget.style.background = '#f1f3f4';
              }
            }}
            onMouseLeave={(e) => {
              if (!isStart && !isEnd && !isInRange) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {d}
          </div>
        </div>
      );
    }

    return (
      <div style={{ width: '100%', maxWidth: '320px', border: '1px solid #dadce0', borderRadius: '12px', padding: '16px', background: 'white', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '4px 8px', color: '#5f6368' }}>&lt;</button>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#202124' }}>
            {monthNames[calendarMonth]}, {calendarYear}
          </span>
          <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '4px 8px', color: '#5f6368' }}>&gt;</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
          {dayLabels.map(label => (
            <span key={label} style={{ fontSize: '11px', fontWeight: '600', color: '#70757a' }}>{label}</span>
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days}
        </div>
      </div>
    );
  };

  const handleAddBonus = async (e) => {
    e.preventDefault();
    if ((!showForGuests && selectedUserIds.length === 0) || bonusRate === '' || !bonusStart || !bonusEnd) {
      alert('Vui lòng chọn ít nhất một thành viên (hoặc tích chọn Hiển thị cho khách vãng lai) và nhập đầy đủ thông tin bắt buộc');
      return;
    }

    const rateInt = parseInt(bonusRate, 10);
    if (isNaN(rateInt) || rateInt < -50 || rateInt > 50) {
      alert('Tỷ lệ thưởng phải là số nguyên từ -50 đến 50 (Ví dụ: 10 cho +10%, -5 cho -5%)');
      return;
    }
    const rateFloat = rateInt / 100;

    setAddingBonus(true);
    try {
      const res = await fetch('/api/admin/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          bonusRate: rateFloat,
          startDate: bonusStart,
          endDate: bonusEnd,
          description: bonusDesc,
          marqueeText: bonusMarquee,
          showForGuests: showForGuests,
          autoApply: autoApplyNewUsers
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Thêm thưởng đặc biệt thành công!');
        setSelectedUserIds([]);
        setBonusRate('');
        setBonusStart('');
        setBonusEnd('');
        setBonusDesc('');
        setBonusMarquee('');
        setShowForGuests(false);
        setAutoApplyNewUsers(false);
        await fetchBonuses();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setAddingBonus(false);
    }
  };

  const handleCopyBonusConfig = (b) => {
    if (!b) return;
    setBonusRate((parseFloat(b.bonus_rate) * 100).toFixed(0));
    setBonusStart(b.start_date.substring(0, 10));
    setBonusEnd(b.end_date.substring(0, 10));
    setBonusDesc(b.description || '');
    setBonusMarquee(b.marquee_text || '');
    setShowForGuests(b.show_for_guests === 1 || b.show_for_guests === true);
    
    // Smooth scroll back to form
    const formElement = document.querySelector('form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getUniqueBonuses = () => {
    const seen = new Set();
    const unique = [];
    for (const b of bonuses) {
      const key = `${b.bonus_rate}-${b.start_date}-${b.end_date}-${b.description || ''}-${b.marquee_text || ''}-${b.show_for_guests || 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(b);
      }
    }
    return unique;
  };

  const handleDeleteBonus = async (id) => {
    if (!confirm('Xác nhận xóa chương trình thưởng đặc biệt này?')) return;
    try {
      const res = await fetch(`/api/admin/bonuses?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Xóa thành công');
        await fetchBonuses();
      } else {
        alert('Lỗi khi xóa');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const handleStartEditUser = (user) => {
    setEditingUser(user);
    setEditCommission((user.commission_rate * 100).toFixed(0));
    setEditCustomAffiliateId(user.custom_affiliate_id || '');
    setEditEmail(user.email || '');
  };

  const handleResetPassword = async (userObj) => {
    if (!userObj.email) {
      alert("Thành viên này không có địa chỉ email trên hệ thống!");
      return;
    }
    const confirmReset = confirm(`Bạn có chắc chắn muốn gửi email khôi phục mật khẩu tới thành viên ${userObj.username} (${userObj.email}) không?`);
    if (!confirmReset) return;
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userObj.email
        })
      });
      if (res.ok) {
        alert(`Đã gửi email khôi phục mật khẩu tới hộp thư ${userObj.email} thành công!`);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Lỗi khi gửi email khôi phục mật khẩu.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const rateFloat = parseFloat(editCommission) / 100;
    if (isNaN(rateFloat) || rateFloat < 0 || rateFloat > 10) {
      alert('Tỷ lệ hoa hồng không hợp lệ (Ví dụ: 50 cho 50%)');
      return;
    }

    setUpdatingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...editingUser,
          email: editEmail,
          commission_rate: rateFloat,
          custom_affiliate_id: editCustomAffiliateId || null
        })
      });
      if (res.ok) {
        alert('Cập nhật thành công');
        setEditingUser(null);
        await fetchUsers();
      } else {
        alert('Lỗi khi cập nhật');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setUpdatingUser(false);
    }
  };

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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers(usersCurrentPage);
    }
  }, [usersCurrentPage, activeTab]);

  useEffect(() => {
    if (activeTab === 'financials') {
      fetchFinancials();
    }
  }, [activeTab, financialStartDate, financialEndDate]);

  useEffect(() => {
    if (financialFilterRange === 'custom') return;
    
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (financialFilterRange === 'today') {
      // already set to today
    } else if (financialFilterRange === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (financialFilterRange === '7days') {
      start.setDate(today.getDate() - 7);
    } else if (financialFilterRange === '30days') {
      start.setDate(today.getDate() - 30);
    } else if (financialFilterRange === 'thismonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (financialFilterRange === 'lastmonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    
    const toDateString = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}`;
    };
    
    setFinancialStartDate(toDateString(start));
    setFinancialEndDate(toDateString(end));
  }, [financialFilterRange]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSettingsStatus('Đang lưu...');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          global_affiliate_id: globalAffiliateId, 
          guest_affiliate_id: guestAffiliateId,
          marquee_speed_desktop: marqueeSpeedDesktop,
          marquee_speed_mobile: marqueeSpeedMobile
        })
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

  const handleQuickUpdateMarqueeSpeed = async (e) => {
    e.preventDefault();
    setSettingsStatus('Đang lưu tốc độ...');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          global_affiliate_id: globalAffiliateId, 
          guest_affiliate_id: guestAffiliateId,
          marquee_speed_desktop: marqueeSpeedDesktop,
          marquee_speed_mobile: marqueeSpeedMobile
        })
      });
      if (res.ok) {
        setSettingsStatus('Lưu tốc độ thành công!');
        setTimeout(() => setSettingsStatus(''), 3000);
      } else {
        setSettingsStatus('Lỗi khi lưu.');
      }
    } catch (err) {
      setSettingsStatus('Lỗi kết nối.');
    }
  };

  const getFilteredBonuses = () => {
    return bonuses.filter(b => 
      b.username.toLowerCase().includes(bonusSearchTerm.toLowerCase().trim()) ||
      (b.description && b.description.toLowerCase().includes(bonusSearchTerm.toLowerCase().trim())) ||
      (b.marquee_text && b.marquee_text.toLowerCase().includes(bonusSearchTerm.toLowerCase().trim()))
    );
  };

  const handleSelectBonus = (id, checked) => {
    if (checked) {
      setSelectedBonusIds(prev => [...prev, id]);
    } else {
      setSelectedBonusIds(prev => prev.filter(item => item !== id));
    }
  };

  const getBonusesOnCurrentPage = (filtered) => {
    const startIndex = (bonusCurrentPage - 1) * 10;
    return filtered.slice(startIndex, startIndex + 10);
  };

  const isAllBonusesSelectedOnPage = () => {
    const filtered = getFilteredBonuses();
    if (filtered.length === 0) return false;
    const pageItems = getBonusesOnCurrentPage(filtered);
    return pageItems.every(item => selectedBonusIds.includes(item.id));
  };

  const handleSelectAllBonusesOnPage = (e) => {
    const checked = e.target.checked;
    const filtered = getFilteredBonuses();
    const pageItems = getBonusesOnCurrentPage(filtered);
    const pageIds = pageItems.map(item => item.id);
    
    if (checked) {
      setSelectedBonusIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelectedBonusIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleBulkDeleteBonuses = async () => {
    if (selectedBonusIds.length === 0) return;
    if (!confirm(`Xác nhận xóa ${selectedBonusIds.length} chương trình thưởng đặc biệt đã chọn?`)) return;
    
    try {
      const res = await fetch(`/api/admin/bonuses?ids=${selectedBonusIds.join(',')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Xóa thành công');
        setSelectedBonusIds([]);
        await fetchBonuses();
      } else {
        alert('Lỗi khi xóa');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const getBonusStatus = (b) => {
    const now = new Date();
    const start = new Date(b.start_date);
    const end = new Date(b.end_date);
    if (now < start) return { text: 'Chưa diễn ra', className: 'status-đang-chờ-xử-lý' };
    if (now > end) return { text: 'Đã hết hạn', className: 'status-đã-hủy' };
    return { text: 'Đang hoạt động', className: 'status-hoàn-thành' };
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

  const handleRemindUser = async (userId) => {
    if (!confirm('Gửi email nhắc nhở user cập nhật thông tin còn thiếu?')) return;
    try {
      const res = await fetch('/api/admin/users/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Đã gửi email nhắc nhở thành công!');
      } else {
        alert(data.error || 'Lỗi khi gửi email nhắc nhở');
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
          className={`tab-btn ${activeTab === 'bills' ? 'active' : ''}`}
          onClick={() => setActiveTab('bills')}
        >
          Lịch sử Bill đã trả
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bonuses' ? 'active' : ''}`}
          onClick={() => setActiveTab('bonuses')}
        >
          Thưởng Đặc Biệt
        </button>
        <button 
          className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`}
          onClick={() => setActiveTab('financials')}
        >
          Doanh thu & Lợi nhuận
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px' }}>ID</th>
                    <th style={{ padding: '12px 8px' }}>Username</th>
                    <th style={{ padding: '12px 8px' }}>Họ Tên</th>
                    <th style={{ padding: '12px 8px' }}>Số điện thoại</th>
                    <th style={{ padding: '12px 8px' }}>QR Code</th>
                    <th style={{ padding: '12px 8px' }}>Tỷ lệ hoa hồng</th>
                    <th style={{ padding: '12px 8px' }}>Affiliate ID riêng</th>
                    <th style={{ padding: '12px 8px' }}>Quyền</th>
                    <th style={{ padding: '12px 8px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="9" style={{ padding: '20px', textAlign: 'center' }}>Chưa có dữ liệu.</td></tr>
                  ) : (
                    users.map((u, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{u.id}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{u.username}</td>
                        <td style={{ padding: '12px 8px' }}>{u.full_name || '-'}</td>
                        <td style={{ padding: '12px 8px' }}>{u.phone || '-'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          {u.bank_qr ? (
                            <a href={u.bank_qr} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', fontSize: '12px', fontWeight: 'bold', textDecoration: 'underline' }}>
                               Xem mã QR
                            </a>
                          ) : (
                            <span style={{ color: '#ea4335', fontSize: '12px', background: '#fce8e6', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                               Chưa cập nhật
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{(u.commission_rate * 100).toFixed(0)}%</span>
                        </td>
                        <td style={{ padding: '12px 8px', color: u.custom_affiliate_id ? 'var(--primary-color)' : '#666', fontWeight: u.custom_affiliate_id ? 'bold' : 'normal' }}>
                          {u.custom_affiliate_id || 'Mặc định'}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`status-badge ${u.role === 'admin' ? 'status-hoàn-thành' : 'status-đã-hủy'}`}>{u.role}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => handleStartEditUser(u)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                              Sửa
                            </button>
                            <button 
                              onClick={() => handleResetPassword(u)} 
                              className="btn-secondary" 
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px',
                                color: '#ea4335',
                                borderColor: '#ea4335'
                              }}
                            >
                              Reset Pass
                            </button>
                            {(!u.bank_qr || !u.full_name || !u.phone) && (
                              <button 
                                onClick={() => handleRemindUser(u.id)} 
                                className="btn-primary" 
                                style={{ 
                                  padding: '4px 8px', 
                                  fontSize: '12px', 
                                  backgroundColor: '#fbbc05', 
                                  borderColor: '#fbbc05', 
                                  color: '#202124',
                                  fontWeight: '600'
                                }}
                              >
                                Nhắc cập nhật
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {usersTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => setUsersCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={usersCurrentPage === 1}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Trang trước
                </button>
                <span style={{ fontSize: '14px' }}>Trang {usersCurrentPage} / {usersTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setUsersCurrentPage(p => Math.min(p + 1, usersTotalPages))}
                  disabled={usersCurrentPage === usersTotalPages}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Trang sau
                </button>
              </div>
            )}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px' }}>Mã Đơn</th>
                    <th style={{ padding: '12px 8px' }}>Username</th>
                    <th style={{ padding: '12px 8px', minWidth: '180px' }}>Tên sản phẩm</th>
                    <th style={{ padding: '12px 8px' }}>Thời gian đặt hàng</th>
                    <th style={{ padding: '12px 8px' }}>Thời gian hoàn thành</th>
                    <th style={{ padding: '12px 8px' }}>HH Shopee</th>
                    <th style={{ padding: '12px 8px' }}>HH User</th>
                    <th style={{ padding: '12px 8px' }}>Trạng thái</th>
                    <th style={{ padding: '12px 8px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="9" style={{ padding: '20px', textAlign: 'center' }}>Chưa có đơn hàng nào.</td></tr>
                  ) : (
                    orders.map((o, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{o.order_id}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{o.sub_id1 || '-'}</td>
                        <td 
                          style={{ 
                            padding: '12px 8px', 
                            maxWidth: '250px', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                          }}
                          title={o.item_name}
                        >
                          {o.item_name || '-'}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {o.order_time ? new Date(o.order_time).toLocaleString('vi-VN') : '-'}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {o.completed_time ? new Date(o.completed_time).toLocaleString('vi-VN') : '-'}
                        </td>
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
                    <th style={{ padding: '12px 8px' }}>Hoa hồng cá nhân</th>
                    <th style={{ padding: '12px 8px' }}>Thưởng giới thiệu</th>
                    <th style={{ padding: '12px 8px' }}>Tổng chuyển khoản</th>
                    <th style={{ padding: '12px 8px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center' }}>Không có yêu cầu thanh toán nào trước ngày này.</td></tr>
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
                        <td style={{ padding: '12px 8px', color: '#5f6368' }}>
                          {Number(p.personal_payout).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '12px 8px', color: '#5f6368' }}>
                          {Number(p.referral_payout).toLocaleString('vi-VN')} đ
                        </td>
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

        {activeTab === 'bills' && (
          <div>
            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8f9fa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ marginBottom: '8px' }}>Lịch sử Bill đã thanh toán</h3>
                  <p style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>Danh sách các hóa đơn/bill đã được thanh toán cho người dùng (lưu trữ độc lập).</p>
                </div>
                <button onClick={fetchBills} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  Làm mới dữ liệu
                </button>
              </div>
            </div>

            {billsStatus && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-text)' }}>{billsStatus}</div>}

            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                    <th style={{ padding: '12px 8px' }}>Mã Hóa Đơn</th>
                    <th style={{ padding: '12px 8px' }}>Username</th>
                    <th style={{ padding: '12px 8px' }}>Họ Tên / Điện thoại</th>
                    <th style={{ padding: '12px 8px' }}>Thông tin Bank (QR)</th>
                    <th style={{ padding: '12px 8px' }}>Số đơn hàng</th>
                    <th style={{ padding: '12px 8px' }}>Hoa hồng cá nhân</th>
                    <th style={{ padding: '12px 8px' }}>Thưởng giới thiệu</th>
                    <th style={{ padding: '12px 8px' }}>Tổng thanh toán</th>
                    <th style={{ padding: '12px 8px' }}>Ngày chốt đối soát</th>
                    <th style={{ padding: '12px 8px' }}>Thời gian trả</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr><td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Chưa có hóa đơn thanh toán nào được lưu trữ.</td></tr>
                  ) : (
                    bills.map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '500', color: '#1a73e8' }}>#{b.id}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{b.username}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: '500' }}>{b.full_name || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#666' }}>{b.phone || '-'}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {b.bank_qr ? (
                            <a href={b.bank_qr} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', fontSize: '12px', textDecoration: 'underline' }}>Xem mã QR</a>
                          ) : (
                            <span style={{ color: '#ccc', fontSize: '12px' }}>Không có QR</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>{b.order_count} đơn</td>
                        <td style={{ padding: '12px 8px', color: b.personal_payout < 0 ? '#ea4335' : '#34a853', fontWeight: b.personal_payout < 0 ? 'bold' : 'normal' }}>
                          {Number(b.personal_payout).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '12px 8px', color: b.referral_payout < 0 ? '#ea4335' : '#34a853', fontWeight: b.referral_payout < 0 ? 'bold' : 'normal' }}>
                          {Number(b.referral_payout).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold', color: b.total_payout < 0 ? '#ea4335' : '#1e8e3e', fontSize: '16px' }}>
                          {Number(b.total_payout).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '13px', color: '#5f6368' }}>
                          {b.cutoff_date ? new Date(b.cutoff_date).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '13px', color: '#5f6368' }}>
                          {b.created_at ? new Date(b.created_at).toLocaleString('vi-VN') : '-'}
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
          <div className="profile-section" style={{ maxWidth: '640px' }}>
            <form onSubmit={handleUpdateSettings}>
              <div style={{ padding: '16px', background: '#f0f7ff', borderRadius: '8px', marginBottom: '24px', border: '1px solid #cce0ff' }}>
                <p style={{ fontSize: '13px', color: '#1a5fb4', margin: 0 }}>
                  ⓘ Hệ thống hỗ trợ 2 Affiliate ID riêng biệt: một cho user đã đăng ký tài khoản và một cho khách vãng lai chưa đăng nhập.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Affiliate ID — Dành cho User đã đăng ký</label>
                <input
                  type="text"
                  className="form-input"
                  value={globalAffiliateId}
                  onChange={e => setGlobalAffiliateId(e.target.value)}
                  placeholder="Ví dụ: 17399820370"
                />
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px', display: 'block' }}>
                  Áp dụng cho tất cả user đã đăng nhập tài khoản khi chuyển đổi link.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Affiliate ID — Dành cho Khách vãng lai (Chưa đăng nhập)</label>
                <input
                  type="text"
                  className="form-input"
                  value={guestAffiliateId}
                  onChange={e => setGuestAffiliateId(e.target.value)}
                  placeholder="Ví dụ: 17399820370"
                />
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px', display: 'block' }}>
                  Áp dụng cho user chưa đăng nhập khi chuyển đổi link trên trang chủ.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="form-label">Tốc độ chạy chữ Marquee - Desktop (giây)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={marqueeSpeedDesktop}
                    onChange={e => setMarqueeSpeedDesktop(e.target.value)}
                    placeholder="Mặc định: 12"
                    min="2"
                    max="60"
                    required
                  />
                  <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px', display: 'block' }}>
                    Thời gian chạy hết một vòng trên máy tính (màn hình rộng, mặc định: 12 giây).
                  </span>
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label className="form-label">Tốc độ chạy chữ Marquee - Mobile (giây)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={marqueeSpeedMobile}
                    onChange={e => setMarqueeSpeedMobile(e.target.value)}
                    placeholder="Mặc định: 8"
                    min="2"
                    max="60"
                    required
                  />
                  <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px', display: 'block' }}>
                    Thời gian chạy hết một vòng trên điện thoại (màn hình hẹp hơn, mặc định: 8 giây).
                  </span>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Lưu cài đặt</button>
              {settingsStatus && (
                <span style={{ marginLeft: '16px', color: settingsStatus.includes('Lỗi') ? 'red' : 'green', fontWeight: '500' }}>
                  {settingsStatus}
                </span>
              )}
            </form>
          </div>
        )}

        {activeTab === 'bonuses' && (
          <div>
            <div style={{ marginBottom: '24px', padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', background: '#f8fafc' }}>
              <h3 style={{ marginBottom: '20px', color: '#0f172a', fontWeight: '700', fontSize: '16px' }}>Thêm Chương Trình Thưởng Hoàn Tiền Đặc Biệt</h3>
              
              <form onSubmit={handleAddBonus} style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '20px',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                width: '100%'
              }}>
                
                {/* Left Column: Scrollable Checkbox List for choosing multiple/all users */}
                <div style={{ 
                  flex: '1 1 380px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                      👥 1. Chọn thành viên ({selectedUserIds.length})
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button type="button" onClick={handleSelectAllUsers} style={{ background: 'none', border: 'none', color: '#1a73e8', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}>Chọn tất cả</button>
                      <span style={{ color: '#e2e8f0', fontSize: '11px' }}>|</span>
                      <button type="button" onClick={handleClearUserSelection} style={{ background: 'none', border: 'none', color: '#ea4335', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}>Bỏ chọn hết</button>
                    </div>
                  </div>

                  {/* Search Bar for Member Selection */}
                  <div style={{ position: 'relative', width: '100%', marginBottom: '4px' }}>
                    <input 
                      type="text"
                      placeholder="🔍 Tìm kiếm tên đăng nhập..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        paddingRight: '30px',
                        fontSize: '12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        background: '#f8fafc'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1a73e8'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                    {userSearchTerm && (
                      <button 
                        type="button"
                        onClick={() => setUserSearchTerm('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    background: '#f8fafc', 
                    height: '240px', 
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '8px'
                  }}>
                    {allUsersForBonus.filter(u => 
                      u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.full_name && u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()))
                    ).length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>
                        <span>Không tìm thấy thành viên phù hợp</span>
                      </div>
                    ) : (
                      allUsersForBonus
                        .filter(u => 
                          u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          (u.full_name && u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()))
                        )
                        .map((u) => (
                          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: selectedUserIds.includes(u.id) ? '#e8f0fe' : 'transparent', transition: 'all 0.15s ease' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedUserIds.includes(u.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds(prev => [...prev, u.id]);
                                } else {
                                  setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                }
                              }}
                              style={{ accentColor: '#1a73e8' }}
                            />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }} title={`${u.username} (${u.full_name || 'Không tên'})${u.role === 'admin' ? ' [Admin]' : ''}`}>
                              <strong style={{ color: selectedUserIds.includes(u.id) ? '#1a73e8' : '#334155' }}>{u.username}</strong>
                              {u.role === 'admin' && (
                                <span style={{ color: '#ea4335', fontSize: '9px', fontWeight: 'bold', background: '#fce8e6', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                                  Ad
                                </span>
                              )}
                            </span>
                          </label>
                        ))
                    )}
                  </div>
                </div>

                {/* Right Column: Settings & Content */}
                <div style={{ 
                  flex: '1 2 450px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                      ⚙️ 2. Thiết lập cấu hình chương trình
                    </span>
                    {bonuses && bonuses.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => handleCopyBonusConfig(bonuses[0])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1a73e8',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          padding: 0
                        }}
                        title="Sao chép nhanh thông số từ bản ghi thưởng gần đây nhất"
                      >
                        ⚡ Dùng cấu hình gần nhất
                      </button>
                    )}
                  </div>

                  {/* Select template from previous unique programs */}
                  {bonuses && bonuses.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                        📋 Nhân bản cấu hình mẫu từ chương trình cũ
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const selected = bonuses.find(b => b.id.toString() === val);
                            if (selected) {
                              handleCopyBonusConfig(selected);
                            }
                          }
                        }}
                        defaultValue=""
                        style={{
                          padding: '9px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: 'white',
                          fontSize: '13px',
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Chọn một cấu hình mẫu cũ --</option>
                        {getUniqueBonuses().map((b) => (
                          <option key={b.id} value={b.id}>
                            [+{(parseFloat(b.bonus_rate) * 100).toFixed(0)}%] {b.description || 'Không mô tả'} ({b.start_date.substring(0, 10)} đến {b.end_date.substring(0, 10)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Row 1: Commission rate & Timepicker */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 180px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                        Tỷ lệ hoa hồng thưởng (%) *
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min="-50"
                        max="50"
                        step="1"
                        placeholder="Từ -50 đến 50 (vd: 10 cho +10%, -5 cho -5%)"
                        value={bonusRate}
                        onChange={(e) => setBonusRate(e.target.value)}
                        style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px', 
                      flex: '1 1 180px',
                      position: 'relative' // Critical to position absolute the calendar popover!
                    }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                        Thời gian áp dụng *
                      </label>
                      
                      {/* Compact Timepicker Icon and Badge Display */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '40px' }}>
                        <div 
                          onClick={() => setShowCalendarDropdown(prev => !prev)}
                          title="Chọn khoảng ngày áp dụng"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            border: showCalendarDropdown ? '2px solid #1a73e8' : '1px solid #dadce0',
                            borderRadius: '50%',
                            background: 'white',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#1a73e8';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            if (!showCalendarDropdown) {
                              e.currentTarget.style.borderColor = '#dadce0';
                            }
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <svg viewBox="0 0 24 24" style={{ fill: '#1a73e8', width: '20px', height: '20px' }}>
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 3h5v5h-5z" />
                          </svg>
                        </div>

                        {/* Selected Range badge */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {bonusStart ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#e8f0fe',
                              color: '#1a73e8',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: '600',
                              border: '1px solid #d2e3fc',
                              whiteSpace: 'nowrap'
                            }}>
                              <span>
                                📅 {bonusStart} {bonusEnd ? `→ ${bonusEnd}` : ''}
                              </span>
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); setBonusStart(''); setBonusEnd(''); }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ea4335',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '11px',
                                  padding: '0 2px',
                                  lineHeight: 1
                                }}
                                title="Xóa chọn"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                              Chưa chọn ngày
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Popover Dropdown Calendar */}
                      {showCalendarDropdown && (
                        <>
                          {/* Invisible backdrop for closing when clicked outside */}
                          <div 
                            onClick={() => setShowCalendarDropdown(false)}
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 999,
                              background: 'transparent',
                              cursor: 'default'
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0, // Align right so calendar pops inwards instead of overflowing out of screen bounds!
                            zIndex: 1000,
                            marginTop: '8px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0,0,0,0.3)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                          }}>
                            {renderCalendar()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Description */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                      Mô tả khuyến mại
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ví dụ: Đợt khuyến mại đặc biệt 1/6"
                      value={bonusDesc}
                      onChange={(e) => setBonusDesc(e.target.value)}
                      style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>

                  {/* Row 3: Marquee Text */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                      Dòng chữ chạy tại trang chủ của user (Marquee Text)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ví dụ: Bạn đang nhận x2 hoàn tiền từ đợt siêu sale 1/6! Tận dụng ngay..."
                      value={bonusMarquee}
                      onChange={(e) => setBonusMarquee(e.target.value)}
                      style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>

                  {/* Row 3.5: Tốc độ chạy chữ Marquee (giây) */}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 140px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                        Tốc độ trên Máy tính (Desktop)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={marqueeSpeedDesktop}
                          onChange={e => setMarqueeSpeedDesktop(e.target.value)}
                          placeholder="Máy tính"
                          min="2"
                          max="60"
                          required
                          style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '90px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '13px', color: '#64748b' }}>giây</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 140px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                        Tốc độ trên Điện thoại (Mobile)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={marqueeSpeedMobile}
                          onChange={e => setMarqueeSpeedMobile(e.target.value)}
                          placeholder="Điện thoại"
                          min="2"
                          max="60"
                          required
                          style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '90px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '13px', color: '#64748b' }}>giây</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 100%', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                          * Thời gian chạy hết một vòng. Số giây càng nhỏ chữ chạy càng nhanh. Màn hình máy tính rộng hơn nên thường cần thời gian chạy dài hơn điện thoại.
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            type="button" 
                            onClick={handleQuickUpdateMarqueeSpeed} 
                            className="btn-primary" 
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '13px', 
                              fontWeight: '600',
                              borderRadius: '6px',
                              backgroundColor: '#1a73e8',
                              borderColor: '#1a73e8'
                            }}
                          >
                            Cập nhật tốc độ
                          </button>
                          {settingsStatus && (
                            <span style={{ 
                              fontSize: '13px', 
                              color: settingsStatus.includes('Lỗi') ? '#ea4335' : '#34a853',
                              fontWeight: '600',
                              marginLeft: '8px'
                            }}>
                              {settingsStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto apply checkbox */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', userSelect: 'none', margin: '4px 0' }} title="Khi có thành viên mới đăng ký tài khoản, hệ thống sẽ tự động kích hoạt chương trình này cho họ nếu thời gian vẫn đang diễn ra.">
                    <input
                      type="checkbox"
                      checked={autoApplyNewUsers}
                      onChange={(e) => setAutoApplyNewUsers(e.target.checked)}
                      style={{ accentColor: '#1a73e8', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span><strong>Tự động áp dụng</strong> chương trình này cho thành viên mới đăng ký sau này</span>
                  </label>

                  {/* Guest marquee checkbox */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', userSelect: 'none', margin: '4px 0' }} title="Cho phép hiển thị dòng chữ chạy này kể cả khi khách vãng lai chưa đăng nhập tài khoản.">
                    <input
                      type="checkbox"
                      checked={showForGuests}
                      onChange={(e) => setShowForGuests(e.target.checked)}
                      style={{ accentColor: '#1a73e8', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span><strong>Hiển thị cho khách vãng lai</strong> (Chưa đăng nhập tài khoản)</span>
                  </label>

                  {/* Row 4: Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button type="submit" className="btn-primary" disabled={addingBonus} style={{ padding: '10px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' }}>
                      {addingBonus ? 'Đang xử lý...' : 'Lưu chương trình'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Danh Sách Đặc Quyền Thưởng Đang Có</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Nhập username để lọc/kiểm tra..."
                    value={bonusSearchTerm}
                    onChange={(e) => {
                      setBonusSearchTerm(e.target.value);
                      setBonusCurrentPage(1);
                    }}
                    style={{ padding: '8px 12px', fontSize: '13px', width: '260px' }}
                  />
                  {selectedBonusIds.length > 0 && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleBulkDeleteBonuses}
                      style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#ea4335', borderColor: '#ea4335', fontWeight: 'bold' }}
                    >
                      🗑️ Xóa {selectedBonusIds.length} mục đã chọn
                    </button>
                  )}
                </div>
              </div>
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8f9fa' }}>
                      <th style={{ padding: '12px 8px', width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isAllBonusesSelectedOnPage()}
                          onChange={handleSelectAllBonusesOnPage}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '12px 8px' }}>Username</th>
                      <th style={{ padding: '12px 8px' }}>Tỷ lệ hoa hồng thưởng</th>
                      <th style={{ padding: '12px 8px' }}>Thời gian bắt đầu</th>
                      <th style={{ padding: '12px 8px' }}>Thời gian kết thúc</th>
                      <th style={{ padding: '12px 8px' }}>Trạng thái</th>
                      <th style={{ padding: '12px 8px' }}>Mô tả</th>
                      <th style={{ padding: '12px 8px' }}>Dòng chữ chạy (Marquee)</th>
                      <th style={{ padding: '12px 8px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = getFilteredBonuses();
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                              Không tìm thấy chương trình thưởng đặc biệt nào.
                            </td>
                          </tr>
                        );
                      }
                      const pageItems = getBonusesOnCurrentPage(filtered);
                      return pageItems.map((b) => {
                        const statusObj = getBonusStatus(b);
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedBonusIds.includes(b.id)}
                                onChange={(e) => handleSelectBonus(b.id, e.target.checked)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{b.username}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{ fontWeight: 'bold', color: '#34a853' }}>
                                {(b.bonus_rate * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '13px' }}>{b.start_date}</td>
                            <td style={{ padding: '12px 8px', fontSize: '13px' }}>{b.end_date}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <span className={`status-badge ${statusObj.className}`}>
                                {statusObj.text}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '13px' }}>{b.description || '-'}</td>
                            <td style={{ padding: '12px 8px', fontStyle: b.marquee_text ? 'normal' : 'italic', color: b.marquee_text ? '#202124' : '#999', fontSize: '13px' }}>
                              {b.marquee_text ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span>{b.marquee_text}</span>
                                  {(b.show_for_guests === 1 || b.show_for_guests === true) && (
                                    <span style={{ fontSize: '10px', color: '#1a73e8', background: '#e8f0fe', padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start', fontWeight: 'bold' }}>
                                      Hiển thị cho khách
                                    </span>
                                  )}
                                </div>
                              ) : 'Không có'}
                            </td>
                            <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleCopyBonusConfig(b)}
                                className="btn-primary"
                                style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#1a73e8', borderColor: '#1a73e8' }}
                                title="Sao chép cấu hình này lên form để tạo nhanh chương trình mới"
                              >
                                Sao chép
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBonus(b.id)}
                                className="btn-primary"
                                style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ea4335', borderColor: '#ea4335' }}
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              {(() => {
                const filtered = getFilteredBonuses();
                const totalBPages = Math.ceil(filtered.length / 10);
                if (totalBPages <= 1) return null;
                return (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setBonusCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={bonusCurrentPage === 1}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      Trang trước
                    </button>
                    <span style={{ fontSize: '14px' }}>Trang {bonusCurrentPage} / {totalBPages}</span>
                    <button
                      type="button"
                      onClick={() => setBonusCurrentPage(p => Math.min(p + 1, totalBPages))}
                      disabled={bonusCurrentPage === totalBPages}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      Trang sau
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div>
            <h3 style={{ marginBottom: '16px', color: '#1e293b', fontWeight: '700' }}>Báo cáo Doanh thu & Lợi nhuận</h3>
            
            {/* Time Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[['today', 'Hôm nay'], ['yesterday', 'Hôm qua'], ['7days', '7 ngày qua'], ['30days', '30 ngày qua'], ['thismonth', 'Tháng này'], ['lastmonth', 'Tháng trước'], ['custom', 'Tùy chọn']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFinancialFilterRange(key)}
                    className={`btn-secondary ${financialFilterRange === key ? 'active' : ''}`}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: financialFilterRange === key ? '#1e293b' : 'white',
                      color: financialFilterRange === key ? 'white' : '#475569',
                      borderColor: financialFilterRange === key ? '#1e293b' : '#cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: '1px solid #cbd5e1',
                      transition: 'all 0.2s'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              {financialFilterRange === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={financialStartDate}
                    onChange={(e) => setFinancialStartDate(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                  <span>đến</span>
                  <input
                    type="date"
                    className="form-input"
                    value={financialEndDate}
                    onChange={(e) => setFinancialEndDate(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              )}
            </div>

            {/* Summary Cards */}
            {financialsData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Tổng Doanh Số Đơn</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                    {new Intl.NumberFormat('vi-VN').format(financialsData.summary.total_order_value)}đ
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Từ {financialsData.summary.total_orders} đơn hàng Shopee</div>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #dbeafe', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Doanh Thu (Từ Shopee)</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e40af' }}>
                    {new Intl.NumberFormat('vi-VN').format(financialsData.summary.total_shopee_commission)}đ
                  </div>
                  <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '4px' }}>Tổng hoa hồng gốc từ đối tác</div>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #fee2e2', background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Tổng Chi Trả User</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#991b1b' }}>
                    {new Intl.NumberFormat('vi-VN').format(financialsData.summary.total_user_payouts)}đ
                  </div>
                  <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>Hoa hồng User & người giới thiệu</div>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #fef3c7', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Thu / Chi Ngoài Hệ Thống</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#15803d' }}>
                    Thu: +{new Intl.NumberFormat('vi-VN').format(financialsData.summary.total_manual_revenue)}đ
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#b91c1c', marginTop: '2px' }}>
                    Chi: -{new Intl.NumberFormat('vi-VN').format(financialsData.summary.total_manual_expense)}đ
                  </div>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #dcfce7', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Lợi Nhuận Thực Tế</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#166534' }}>
                    {new Intl.NumberFormat('vi-VN').format(financialsData.summary.total_actual_profit)}đ
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>Shopee Net + Thu ngoài - Chi ngoài</div>
                </div>
              </div>
            )}

            {/* Chart and Top Buyers Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              
              {/* Chart Section */}
              <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', position: 'relative' }}>
                <h4 style={{ marginBottom: '16px', color: '#0f172a', fontWeight: '700', fontSize: '15px' }}>Biểu đồ So Sánh Doanh Thu vs Lợi Nhuận</h4>
                {financialsLoading ? (
                  <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải biểu đồ...</div>
                ) : financialsData && financialsData.chartData && financialsData.chartData.length > 0 ? (
                  <div style={{ position: 'relative', height: '240px' }}>
                    {(() => {
                      const chartData = financialsData.chartData;
                      const paddingLeft = 65;
                      const paddingRight = 20;
                      const paddingTop = 20;
                      const paddingBottom = 40;
                      const svgWidth = 720;
                      const svgHeight = 240;
                      
                      const chartWidth = svgWidth - paddingLeft - paddingRight;
                      const chartHeight = svgHeight - paddingTop - paddingBottom;
                      
                      const minVal = Math.min(0, ...chartData.map(d => Math.min(d.revenue, d.profit)));
                      const maxVal = Math.max(100000, ...chartData.map(d => Math.max(d.revenue, d.profit))) * 1.15;
                      const valRange = maxVal - minVal;
                      
                      const getY = (val) => paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
                      const yZero = getY(0);
                      
                      const barSpacing = chartWidth / chartData.length;
                      const barWidth = Math.max(3, Math.min(20, (barSpacing * 0.5) / 2));
                      
                      const gridLines = [];
                      for (let i = 0; i <= 4; i++) {
                        const ratio = i / 4;
                        const val = minVal + ratio * valRange;
                        gridLines.push({
                          y: getY(val),
                          label: new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val) + 'đ'
                        });
                      }

                      return (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }} onMouseLeave={() => setHoveredIndex(null)}>
                          <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#1d4ed8" />
                              </linearGradient>
                              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#047857" />
                              </linearGradient>
                              <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="#b91c1c" />
                              </linearGradient>
                            </defs>

                            {gridLines.map((line, idx) => (
                              <g key={idx}>
                                <line
                                  x1={paddingLeft}
                                  y1={line.y}
                                  x2={svgWidth - paddingRight}
                                  y2={line.y}
                                  stroke="#e2e8f0"
                                  strokeWidth="1"
                                  strokeDasharray={idx === 0 || line.y === yZero ? '0' : '4 4'}
                                />
                                <text
                                  x={paddingLeft - 8}
                                  y={line.y + 4}
                                  textAnchor="end"
                                  fill="#64748b"
                                  style={{ fontSize: '10px', fontWeight: '500' }}
                                >
                                  {line.label}
                                </text>
                              </g>
                            ))}

                            <line
                              x1={paddingLeft}
                              y1={yZero}
                              x2={svgWidth - paddingRight}
                              y2={yZero}
                              stroke="#94a3b8"
                              strokeWidth="1.5"
                            />

                            {chartData.map((d, i) => {
                              const centerX = paddingLeft + (i + 0.5) * barSpacing;
                              const revY = getY(d.revenue);
                              const revH = Math.max(1, yZero - revY);
                              const profY = getY(d.profit);
                              const isPositive = d.profit >= 0;
                              const profH = isPositive ? Math.max(1, yZero - profY) : Math.max(1, profY - yZero);
                              const profYPos = isPositive ? profY : yZero;

                              return (
                                <g key={i}>
                                  <rect
                                    x={centerX - barWidth - 1}
                                    y={revY}
                                    width={barWidth}
                                    height={revH}
                                    fill="url(#revenueGrad)"
                                    rx="1.5"
                                    opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.6}
                                    style={{ transition: 'opacity 0.2s' }}
                                  />
                                  <rect
                                    x={centerX + 1}
                                    y={profYPos}
                                    width={barWidth}
                                    height={profH}
                                    fill={isPositive ? "url(#profitGrad)" : "url(#lossGrad)"}
                                    rx="1.5"
                                    opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.6}
                                    style={{ transition: 'opacity 0.2s' }}
                                  />

                                  {(chartData.length <= 15 || i % Math.ceil(chartData.length / 10) === 0) && (
                                    <text
                                      x={centerX}
                                      y={svgHeight - paddingBottom + 16}
                                      textAnchor="middle"
                                      fill="#64748b"
                                      style={{ fontSize: '10px', fontWeight: '500' }}
                                    >
                                      {d.label}
                                    </text>
                                  )}

                                  {hoveredIndex === i && (
                                    <line
                                      x1={centerX}
                                      y1={paddingTop}
                                      x2={centerX}
                                      y2={svgHeight - paddingBottom}
                                      stroke="#94a3b8"
                                      strokeWidth="1"
                                      strokeDasharray="2 2"
                                      pointerEvents="none"
                                    />
                                  )}

                                  <rect
                                    x={paddingLeft + i * barSpacing}
                                    y={paddingTop}
                                    width={barSpacing}
                                    height={chartHeight}
                                    fill="transparent"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                  />
                                </g>
                              );
                            })}
                          </svg>

                          {hoveredIndex !== null && chartData[hoveredIndex] && (
                            <div style={{
                              position: 'absolute',
                              background: 'rgba(15, 23, 42, 0.95)',
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                              pointerEvents: 'none',
                              zIndex: 10,
                              top: '-15px',
                              left: `${Math.max(5, Math.min(svgWidth - 165, paddingLeft + (hoveredIndex + 0.5) * barSpacing - 75))}px`,
                              width: '150px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              backdropFilter: 'blur(4px)'
                            }}>
                              <div style={{ fontWeight: '700', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '2px' }}>
                                {chartData[hoveredIndex].label}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span>Doanh thu:</span>
                                <span style={{ color: '#60a5fa', fontWeight: '600' }}>
                                  {new Intl.NumberFormat('vi-VN').format(chartData[hoveredIndex].revenue)}đ
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Lợi nhuận:</span>
                                <span style={{ color: chartData[hoveredIndex].profit >= 0 ? '#34d399' : '#f87171', fontWeight: '600' }}>
                                  {new Intl.NumberFormat('vi-VN').format(chartData[hoveredIndex].profit)}đ
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Không có dữ liệu biểu đồ</div>
                )}
              </div>

              {/* Top Buyers Section */}
              <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ marginBottom: '16px', color: '#0f172a', fontWeight: '700', fontSize: '15px' }}>Top Mua Hàng (Thành viên có doanh số mua cao nhất)</h4>
                {financialsLoading ? (
                  <div>Đang tải danh sách...</div>
                ) : financialsData && financialsData.topBuyers && financialsData.topBuyers.length > 0 ? (
                  <div className="table-container" style={{ overflowX: 'auto', maxHeight: '240px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Hạng</th>
                          <th>Username</th>
                          <th>Họ Tên / Email</th>
                          <th style={{ textAlign: 'right' }}>Đơn</th>
                          <th style={{ textAlign: 'right' }}>Doanh số mua</th>
                          <th style={{ textAlign: 'right' }}>Hoa hồng nhận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialsData.topBuyers.map((buyer, idx) => (
                          <tr key={buyer.username}>
                            <td><strong>#{idx + 1}</strong></td>
                            <td><span className="badge badge-user">{buyer.username}</span></td>
                            <td>
                              <div style={{ fontSize: '12px', fontWeight: '500' }}>{buyer.full_name || 'Chưa cập nhật'}</div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>{buyer.email || '-'}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>{buyer.order_count}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>
                              {new Intl.NumberFormat('vi-VN').format(buyer.total_order_value)}đ
                            </td>
                            <td style={{ textAlign: 'right', color: '#166534' }}>
                              {new Intl.NumberFormat('vi-VN').format(buyer.total_user_commission)}đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Không có dữ liệu mua hàng trong khoảng thời gian này</div>
                )}
              </div>
            </div>

            {/* Manual Financial Logs */}
            <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ color: '#0f172a', fontWeight: '700', fontSize: '15px', margin: 0 }}>Ghi chép Thu / Chi Ngoài Hệ Thống (Server, Domain, Ads...)</h4>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setTransactionType('expense');
                    setTransactionAmount('');
                    setTransactionCategory('Server');
                    setTransactionDescription('');
                    setTransactionDate(new Date().toISOString().slice(0, 10));
                    setShowAddTransactionModal(true);
                  }}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ➕ Ghi nhận Thu / Chi ngoài
                </button>
              </div>

              {financialsLoading ? (
                <div>Đang tải lịch sử...</div>
              ) : financialsData && financialsData.manualTransactions && financialsData.manualTransactions.length > 0 ? (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ngày giao dịch</th>
                        <th>Loại</th>
                        <th>Danh mục</th>
                        <th>Số tiền</th>
                        <th>Mô tả / Ghi chú</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialsData.manualTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>{tx.transaction_date}</td>
                          <td>
                            <span className="badge" style={{
                              backgroundColor: tx.type === 'revenue' ? '#dcfce7' : '#fee2e2',
                              color: tx.type === 'revenue' ? '#15803d' : '#b91c1c',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {tx.type === 'revenue' ? 'Thu nhập' : 'Chi phí'}
                            </span>
                          </td>
                          <td><strong>{tx.category}</strong></td>
                          <td style={{ fontWeight: '600', color: tx.type === 'revenue' ? '#15803d' : '#b91c1c' }}>
                            {tx.type === 'revenue' ? '+' : '-'}{new Intl.NumberFormat('vi-VN').format(tx.amount)}đ
                          </td>
                          <td>{tx.description || <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Không có ghi chú</span>}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleStartEditTransaction(tx)}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '12px', color: '#ea4335', borderColor: '#fee2e2' }}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Không có khoản thu chi ngoài hệ thống nào được ghi nhận trong khoảng thời gian này</div>
              )}
            </div>

            {/* Manual Transaction Dialog */}
            {showAddTransactionModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)'
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '30px',
                  width: '100%',
                  maxWidth: '480px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#111827' }}>
                    {editingTransaction ? 'Chỉnh sửa giao dịch' : 'Ghi nhận Thu / Chi ngoài hệ thống'}
                  </h3>
                  <form onSubmit={handleAddTransaction}>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                        Loại giao dịch
                      </label>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="tx_type"
                            value="expense"
                            checked={transactionType === 'expense'}
                            onChange={() => setTransactionType('expense')}
                          />
                          <span>Chi phí (Expense)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="tx_type"
                            value="revenue"
                            checked={transactionType === 'revenue'}
                            onChange={() => setTransactionType('revenue')}
                          />
                          <span>Thu nhập (Revenue)</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                        Số tiền (VND)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min="1000"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        placeholder="Ví dụ: 350000"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                        Hạng mục / Danh mục
                      </label>
                      <select
                        className="form-input"
                        value={transactionCategory}
                        onChange={(e) => setTransactionCategory(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px' }}
                      >
                        <option value="Server">Máy chủ (VPS, Hosting, Cloud)</option>
                        <option value="Domain">Tên miền (Domain)</option>
                        <option value="Quảng cáo">Quảng cáo (Ads)</option>
                        <option value="Thưởng thêm">Thưởng đặc biệt / Event</option>
                        <option value="Donate">Donate / Tài trợ</option>
                        <option value="Khác">Hạng mục khác</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                        Ngày giao dịch
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        required
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                        Mô tả chi tiết / Ghi chú
                      </label>
                      <textarea
                        className="form-input"
                        rows="3"
                        value={transactionDescription}
                        onChange={(e) => setTransactionDescription(e.target.value)}
                        placeholder="Nhập mô tả cụ thể về khoản thu chi này..."
                        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', padding: '8px 12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'end' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowAddTransactionModal(false);
                          setEditingTransaction(null);
                        }}
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        {editingTransaction ? 'Cập nhật' : 'Ghi nhận'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Editing User Modal Overlay */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#111827' }}>
              Chỉnh sửa Thành viên: {editingUser.username}
            </h3>
            <form onSubmit={handleSaveUser}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  className="form-input"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email của user"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                  Tỷ lệ hoa hồng (%)
                </label>
                <input
                  type="number"
                  className="form-input"
                  required
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value)}
                  placeholder="Ví dụ: 50 cho 50%"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Tỷ lệ hoàn tiền của user từ tổng hoa hồng đối tác (ví dụ: 50).
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                  Affiliate ID riêng (Custom Affiliate ID)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editCustomAffiliateId}
                  onChange={(e) => setEditCustomAffiliateId(e.target.value)}
                  placeholder="Để trống để dùng ID mặc định"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Nếu được điền, tài khoản này sẽ sử dụng ID riêng thay vì ID chung của hệ thống.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingUser(null)}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updatingUser}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  {updatingUser ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
