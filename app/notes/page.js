'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Notes() {
  const [commissionRate, setCommissionRate] = useState(0.50);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSpecialBonus, setActiveSpecialBonus] = useState(null);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        if (data.user) {
          let baseRate = parseFloat(data.user.commission_rate) || 0.50;
          let bonus = data.user.active_special_bonus;
          setActiveSpecialBonus(bonus);
          if (bonus && parseFloat(bonus.bonus_rate) !== 0) {
            setCommissionRate(baseRate + parseFloat(bonus.bonus_rate));
          } else {
            setCommissionRate(baseRate);
          }
          setIsLoggedIn(true);
        }
      })
      .catch(() => {
        setCommissionRate(0.50);
        setIsLoggedIn(false);
        setActiveSpecialBonus(null);
      });
  }, []);

  const noteCategories = [
    {
      type: 'warning',
      icon: '🔥',
      title: '1. Quy tắc click link khi mua nhiều đơn (Nô Tì khẩn cáo!)',
      desc: (
        <span>
          Nô Tì xin tụt quần xin lỗi các sếp. Mặc dù Nô Tì vẫn có các hướng dẫn và lưu ý đầy đủ, nhưng có thể cách nói hơi khô khan khó hiểu nên các sếp vẫn dễ hiểu nhầm khi săn sale đặt mua nhiều đơn.
          <br /><br />
          <strong>⚠️ Vấn đề cực kỳ quan trọng:</strong>
          <br />
          Ngay sau khi sếp <strong>đặt thành công 1 đơn hàng</strong>, các sàn (Shopee) sẽ <strong>tự động xóa toàn bộ lịch sử click link trước đó</strong> của sếp qua Nô Tì. Click 100 lần trước đó cũng chỉ ghi nhận cho duy nhất 1 đơn hàng đầu tiên được thanh toán.
          <br />
          Do đó, nếu sếp share link tất cả sản phẩm A, B, C, D sang Nô Tì trước, rồi vào giỏ hàng mua lần lượt mà không quay lại click link trên Nô Tì, thì ngày hôm sau sếp sẽ chỉ thấy ghi nhận duy nhất đơn hàng A.
          <br /><br />
          <strong>💡 Giải pháp đúng để ghi nhận đủ đơn:</strong>
          <br />
          Sau khi sếp đặt xong đơn A ➡️ <strong>Bắt buộc phải quay lại Nô Tì click lại vào link sản phẩm B</strong> rồi mới đặt tiếp đơn B. Làm tương tự lần lượt với các sản phẩm C và D. Mua đơn nào xong là phải click lại link sản phẩm tiếp theo ngay trước khi mua nhé các sếp!
        </span>
      )
    },
    {
      type: 'warning',
      icon: '⚠️',
      title: '2. Không áp dụng cho Shopee Video & Shopee Live',
      desc: (
        <span>
          Lưu ý cực kỳ quan trọng: Các sản phẩm được đặt mua có gắn tag{' '}
          <strong style={{ color: '#ea4335' }}>"Shopee Video"</strong> hoặc{' '}
          <strong style={{ color: '#ea4335' }}>"Shopee Live"</strong> sẽ{' '}
          <strong style={{ color: '#ea4335', textDecoration: 'underline' }}>KHÔNG ĐƯỢC</strong> ghi nhận hoa hồng hoàn tiền từ đối tác tiếp thị liên kết Shopee. Hãy đảm bảo bạn mua sản phẩm từ các link thông thường.
        </span>
      )
    },
    {
      type: 'info',
      icon: '💳',
      title: '3. Yêu cầu cập nhật QR Code ngân hàng',
      desc: 'Để nhận hoàn tiền tự động vào ngày 15 hàng tháng, bạn bắt buộc phải tải lên ảnh QR Code ngân hàng của mình trong mục "Thông tin cá nhân". Nếu chưa cập nhật, hệ thống sẽ tạm giữ hoa hồng tích lũy của bạn cho đến khi được cập nhật.',
    },
    {
      type: 'success',
      icon: '📅',
      title: '4. Chu kỳ đối soát và Tự động thanh toán',
      desc: (
        <span>
          Toàn bộ hoa hồng tích lũy hợp lệ của bạn sẽ được hệ thống tổng hợp đối soát và tự động chuyển khoản thanh toán vào ngày 15 hàng tháng qua tài khoản ngân hàng từ mã QR bạn cung cấp.
          <br />
          Mức hoàn tiền hiện tại của bạn là:{' '}
          {activeSpecialBonus && parseFloat(activeSpecialBonus.bonus_rate) > 0 ? (
            <span style={{ color: 'var(--primary-color)', fontWeight: '700' }}>
              {(commissionRate * 100).toFixed(0)}%{' '}
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#137333', background: '#e6f4ea', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px', border: '1px solid #a8dab5', display: 'inline-block' }}>
                🔥 Gồm cơ bản & +{(parseFloat(activeSpecialBonus.bonus_rate) * 100).toFixed(0)}% Ưu Đãi Thưởng Đặc Biệt!
              </span>
            </span>
          ) : (
            <strong style={{ color: 'var(--primary-color)' }}>{(commissionRate * 100).toFixed(0)}%</strong>
          )}{' '}
          giá trị hoa hồng nhận từ đối tác tiếp thị liên kết (không phải giá trị tổng đơn hàng).
          <br />
          <strong style={{ color: '#1a73e8' }}>Lưu ý:</strong> Đơn hàng mới mua sẽ được cập nhật tại tab Lịch sử đơn hàng vào ngày hôm sau.
        </span>
      )
    },
    {
      type: 'bonus',
      icon: '👥',
      title: '5. Chương trình mời bạn bè & Nhận thưởng thụ động',
      desc: (
        <span>
          Mời bạn bè tham gia PiShare.site bằng cách chia sẻ Mã giới thiệu hoặc gửi link giới thiệu cá nhân: 
          <br />
          <strong style={{ color: '#ea4335' }}>https://pishare.site/register?ref=username_cua_ban</strong>.
          <br />
          <strong style={{ color: '#137333' }}>Quyền lợi đặc biệt:</strong>
          <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
            <li>Bạn nhận được <strong>thưởng thêm 5% hoa hồng</strong> trích từ phần của hệ thống trên tất cả các đơn hàng hợp lệ của bạn bè trọn đời.</li>
            <li>Đồng thời, bạn được <strong>tặng thêm 5% hoa hồng cá nhân</strong> trong vòng <strong>30 ngày</strong> cho mỗi người giới thiệu thành công kể từ khi họ hoàn thành đơn hàng đầu tiên (thời gian thưởng được cộng dồn tích lũy liên tục).</li>
          </ul>
        </span>
      )
    }
  ];

  return (
    <div className="main-container" style={{ paddingTop: '40px', paddingBottom: '60px', minHeight: '100vh', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
      <div style={{ maxWidth: '800px', width: '100%', padding: '0 16px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#202124', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Các Lưu ý Quan trọng khi dùng PiShare
          </h1>
          <p style={{ fontSize: '16px', color: '#5f6368', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Vui lòng đọc kỹ các quy định và lưu ý dưới đây để đảm bảo quyền lợi tích lũy và đối soát hoàn tiền của bạn luôn ở mức tối đa.
          </p>
        </div>

        {/* Note Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
          {noteCategories.map((note, idx) => {
            let borderColor = '#dfe1e5';
            let bgHeaderColor = '#f8f9fa';
            if (note.type === 'warning') {
              borderColor = '#fad2cf';
              bgHeaderColor = '#fce8e6';
            } else if (note.type === 'info') {
              borderColor = '#d2e3fc';
              bgHeaderColor = '#e8f0fe';
            } else if (note.type === 'success') {
              borderColor = '#c5e1a5';
              bgHeaderColor = '#f1f8e9';
            } else if (note.type === 'bonus') {
              borderColor = '#e1bee7';
              bgHeaderColor = '#f3e5f5';
            }

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: `1px solid ${borderColor}`,
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                }}
              >
                <div style={{
                  padding: '16px 24px',
                  backgroundColor: bgHeaderColor,
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>{note.icon}</span>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#202124', margin: 0 }}>
                    {note.title}
                  </h3>
                </div>
                <div style={{ padding: '24px', fontSize: '14.5px', color: '#4a4a4a', lineHeight: '1.7', textAlign: 'left' }}>
                  {note.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Card */}
        <div style={{
          padding: '24px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1px solid #dfe1e5',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#202124', marginBottom: '8px' }}>
            Bạn cần hỗ trợ hoặc có thắc mắc khác?
          </h4>
          <p style={{ fontSize: '13px', color: '#5f6368', marginBottom: '16px', lineHeight: '1.5' }}>
            Nếu bạn có bất kỳ câu hỏi nào về chu kỳ đối soát, tỷ lệ hoàn tiền hoặc yêu cầu hỗ trợ kỹ thuật, hãy liên hệ trực tiếp với chúng tôi để được giải đáp tức thì:
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <a href="mailto:anhtuhd95@gmail.com" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1a73e8',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#f1f3f4',
              transition: 'background-color 0.2s'
            }}>
              ✉ Email: anhtuhd95@gmail.com
            </a>
            <a href="https://zalo.me/0397872462" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#137333',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#f1f3f4',
              transition: 'background-color 0.2s'
            }}>
              💬 Zalo: 0397872462
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
