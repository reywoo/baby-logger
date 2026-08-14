import React, { useState, useEffect } from 'react';
import { LogIn, User, Lock, ArrowRight, AlertCircle, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';
import ReywooLogo from './ReywooLogo';
import LanguageToggle from './LanguageToggle';

export default function LoginModal({ onLoginSuccess, lang = 'zh', setLang }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isZh = lang === 'zh';

  const [googleClientId, setGoogleClientId] = useState(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );

  // Fetch Google Client ID from server if not baked into frontend bundle
  useEffect(() => {
    if (!googleClientId) {
      fetch('/api/auth/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.googleClientId) {
            setGoogleClientId(data.googleClientId);
          }
        })
        .catch((err) => console.warn('Failed to load Google Auth Config:', err));
    }
  }, [googleClientId]);

  // Initialize Google Identity Services GIS script
  useEffect(() => {
    if (!googleClientId) return;

    const loadGoogleGis = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });

        const btnDiv = document.getElementById('googleSignInBtn');
        if (btnDiv) {
          btnDiv.innerHTML = '';
          window.google.accounts.id.renderButton(btnDiv, {
            theme: 'filled_blue',
            size: 'large',
            width: 300,
            text: 'signin_with',
            shape: 'pill',
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      loadGoogleGis();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = loadGoogleGis;
      document.body.appendChild(script);
    }
  }, [googleClientId, lang]);

  const handleGoogleResponse = async (response) => {
    if (!response.credential) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('FAMILY_AUTH_TOKEN', data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || (isZh ? 'Google 登录失败' : 'Google sign in failed'));
      }
    } catch (err) {
      setError(isZh ? 'Google 登录请求出错' : 'Google sign in network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('FAMILY_AUTH_TOKEN', data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || (isZh ? '用户名或密码错误' : 'Invalid username or password'));
      }
    } catch (err) {
      setError(isZh ? '登录网络错误，请稍后重试' : 'Network error during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      width: '100%',
      padding: '1rem',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem 1.75rem',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        position: 'relative',
      }}>
        {/* Top Language Toggle */}
        {setLang && (
          <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
            <LanguageToggle lang={lang} setLang={setLang} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', marginTop: '0.25rem' }}>
          <ReywooLogo size={56} showText={false} />
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
          {isZh ? '家庭生活与育儿日志' : 'Family Assistant'}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {isZh ? '请登录以访问您的专属数据与设置' : 'Please log in to access your family logs'}
        </p>

        {/* 1. Google OAuth One-Click Sign In (Friends & Family) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '1rem',
          padding: '1.1rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={15} style={{ color: 'var(--primary-accent)' }} />
            <span>{isZh ? 'Google 账号一键登录' : 'Sign in with Google'}</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            width: '100%',
          }}>
            <div id="googleSignInBtn" style={{ display: 'flex', justifyContent: 'center' }} />
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.65rem', lineHeight: 1.4, margin: '0.65rem 0 0 0' }}>
            {isZh
              ? '✨ 亲友首次登录将自动开通账号（系统名额限 5 人）'
              : '✨ Auto-creates account for friends & family (max 5 accounts)'}
          </p>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '1.25rem 0',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
          <span>{isZh ? '或使用密码登录' : 'Or password login'}</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
        </div>

        {/* 2. Password Login Form */}
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              {isZh ? '用户名 Username' : 'Username'}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isZh ? '输入用户名 (如 yoyo 或 admin)...' : 'Enter username (e.g. yoyo or admin)...'}
                className="input-field"
                style={{ paddingLeft: '2.75rem', fontSize: '0.95rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              {isZh ? '密码 Password' : 'Password'}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isZh ? '输入密码...' : 'Enter password...'}
                className="input-field"
                style={{ paddingLeft: '2.75rem', fontSize: '0.95rem' }}
                required
              />
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--danger)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              fontSize: '0.825rem',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="glass-button"
            style={{
              background: 'var(--primary-accent)',
              borderColor: 'var(--primary-accent)',
              justifyContent: 'center',
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 700,
              marginTop: '0.2rem',
            }}
          >
            <span>{loading ? (isZh ? '登录中...' : 'Logging in...') : (isZh ? '密码登录 Login' : 'Login')}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
          <span>{isZh ? '加密传输 • 多账号安全保护' : 'Encrypted & Secure Session'}</span>
        </div>
      </div>
    </div>
  );
}
