'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle OTP digit changes
  const handleChange = (index, value) => {
    if (isNaN(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Focus next input if value is entered
    if (value !== '' && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  // Handle Backspace and arrow keys
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  // Handle Paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && /^\d+$/.test(pasteData)) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      inputRefs[5].current.focus();
    }
  };

  // Submit OTP Code
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setResendMessage('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Vui lòng nhập đầy đủ mã OTP 6 chữ số');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Kích hoạt tài khoản và đăng nhập thành công!');
        // Tự động chuyển hướng vào Trang chủ sau 2 giây
        setTimeout(() => {
          router.push('/');
          // Tải lại trang để Next.js cập nhật cookie auth_token
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }, 1800);
      } else {
        setError(data.error || 'Xác thực OTP thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối mạng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically submit when all 6 digits are entered
  useEffect(() => {
    if (otp.join('').length === 6 && !loading && !success) {
      handleSubmit();
    }
  }, [otp]);

  // Request new OTP code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setError('');
    setResendMessage('');

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setResendMessage('Mã OTP mới đã được gửi tới hòm thư của bạn.');
        setResendCooldown(60); // Reset cooldown to 60s
        setOtp(['', '', '', '', '', '']); // Clear input
        inputRefs[0].current.focus();
      } else {
        setError(data.error || 'Không thể gửi lại mã OTP');
      }
    } catch (err) {
      setError('Lỗi kết nối mạng.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '24px',
      padding: '40px',
      width: '100%',
      maxWidth: '460px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
      border: '1px solid #e8eaed',
      position: 'relative',
      textAlign: 'center'
    }}>
      {/* Icon Header */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        backgroundColor: success ? '#e6f4ea' : '#e8f0fe',
        color: success ? '#137333' : '#1a73e8',
        marginBottom: '24px'
      }}>
        {success ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '36px', height: '36px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '36px', height: '36px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A2.25 2.25 0 0 1 10.83 3h2.34a2.25 2.25 0 0 1 2.966 1.243l1.268 3.8a2.25 2.25 0 0 0 1.29 1.29l3.8 1.268a2.25 2.25 0 0 1 1.243 2.966v2.34a2.25 2.25 0 0 1-1.243 2.966l-3.8 1.268a2.25 2.25 0 0 0-1.29 1.29l-1.268 3.8a2.25 2.25 0 0 1-2.966 1.243h-2.34a2.25 2.25 0 0 1-2.966-1.243l-1.268-3.8a2.25 2.25 0 0 0-1.29-1.29l-3.8-1.268a2.25 2.25 0 0 1-1.243-2.966v-2.34a2.25 2.25 0 0 1 1.243-2.966l3.8-1.268a2.25 2.25 0 0 0 1.29-1.29l1.268-3.8Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75" />
          </svg>
        )}
      </div>

      <h1 style={{
        fontSize: '24px',
        fontWeight: '800',
        color: '#202124',
        marginBottom: '10px',
        letterSpacing: '-0.5px'
      }}>
        {success ? 'Xác thực thành công!' : 'Nhập mã xác thực'}
      </h1>

      <p style={{
        fontSize: '14px',
        color: '#5f6368',
        lineHeight: '1.6',
        marginBottom: '28px',
        maxWidth: '380px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        {success ? (
          'Chúc mừng! Tài khoản đã được kích hoạt. Đang chuyển hướng bạn tới trang chủ...'
        ) : (
          <>
            Chúng tôi đã gửi mã OTP gồm 6 chữ số tới hòm thư:
            <br />
            <strong style={{ color: '#202124', wordBreak: 'break-all' }}>{email}</strong>
          </>
        )}
      </p>

      {/* Verification Inputs */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '20px'
        }}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={loading || success !== ''}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              style={{
                width: '48px',
                height: '56px',
                fontSize: '24px',
                fontWeight: '700',
                textAlign: 'center',
                borderRadius: '12px',
                border: error ? '2px solid #ea4335' : '1px solid #dadce0',
                backgroundColor: loading || success ? '#f8f9fa' : 'white',
                color: '#202124',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = '#1a73e8';
                e.target.style.boxShadow = '0 0 0 3px rgba(26, 115, 232, 0.15)';
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = '#dadce0';
                e.target.style.boxShadow = 'none';
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            color: '#d93025',
            backgroundColor: '#fce8e6',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '16px',
            textAlign: 'center',
            display: 'inline-block'
          }}>
            ⚠ {error}
          </div>
        )}

        {resendMessage && (
          <div style={{
            color: '#137333',
            backgroundColor: '#e6f4ea',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '16px',
            textAlign: 'center',
            display: 'inline-block'
          }}>
            ✓ {resendMessage}
          </div>
        )}

        {success && (
          <div style={{
            color: '#137333',
            backgroundColor: '#e6f4ea',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '700',
            marginBottom: '16px',
            textAlign: 'center',
            display: 'inline-block'
          }}>
            ✓ {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success !== '' || otp.join('').length < 6}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '15px',
            fontWeight: '700',
            borderRadius: '12px',
            cursor: 'pointer',
            border: 'none',
            display: 'block',
            boxSizing: 'border-box'
          }}
        >
          {loading ? 'Đang xác minh...' : 'Xác minh & Đăng nhập'}
        </button>
      </form>

      {/* Resend Cooldown Section */}
      <div style={{
        marginTop: '20px',
        fontSize: '14px',
        color: '#5f6368'
      }}>
        {resendCooldown > 0 ? (
          <span>
            Gửi lại mã OTP sau <strong style={{ color: '#202124' }}>{resendCooldown}s</strong>
          </span>
        ) : (
          <button
            onClick={handleResendOtp}
            disabled={resending || success !== ''}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a73e8',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              fontSize: '14px'
            }}
          >
            {resending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
          </button>
        )}
      </div>

      {/* Admin support */}
      <div style={{
        marginTop: '32px',
        paddingTop: '20px',
        borderTop: '1px solid #f1f3f4',
        fontSize: '13px',
        color: '#5f6368'
      }}>
        <span>Gặp sự cố xác thực? Liên hệ Admin:</span>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          fontWeight: '600',
          marginTop: '6px'
        }}>
          <span style={{ color: '#1a73e8' }}>✉ anhtuhd95@gmail.com</span>
          <span style={{ color: '#137333' }}>💬 Zalo: 0397872462</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <Suspense fallback={
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e8eaed',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '20px', color: '#5f6368' }}>Đang tải...</h1>
        </div>
      }>
        <VerifyOtpContent />
      </Suspense>
    </div>
  );
}
