import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function PasscodeLock({ onPasscodeSubmit, error, lang = 'zh' }) {
  const [inputPasscode, setInputPasscode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputPasscode.trim()) return;
    setLoading(true);
    await onPasscodeSubmit(inputPasscode.trim());
    setLoading(false);
  };

  const isZh = lang === 'zh';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      width: '100%',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          color: 'var(--primary-accent)'
        }}>
          <Lock size={32} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
          {isZh ? '受密码保护的家庭日志' : 'Passcode Protected Assistant'}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: '1.4' }}>
          {isZh
            ? '请输入家庭专属访问密码以继续使用'
            : 'Please enter the family passcode to access features'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              {isZh ? '访问密码 Passcode' : 'Passcode'}
            </label>
            <input
              type="password"
              value={inputPasscode}
              onChange={(e) => setInputPasscode(e.target.value)}
              placeholder={isZh ? '输入密码...' : 'Enter passcode...'}
              className="input-field"
              style={{ fontSize: '1.1rem', letterSpacing: '0.1em' }}
              autoFocus
            />
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
              textAlign: 'left'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !inputPasscode.trim()}
            className="glass-button"
            style={{
              background: 'var(--primary-accent)',
              borderColor: 'var(--primary-accent)',
              justifyContent: 'center',
              padding: '0.85rem',
              fontSize: '1rem',
              marginTop: '0.5rem'
            }}
          >
            <span>{loading ? (isZh ? '验证中...' : 'Verifying...') : (isZh ? '进入系统' : 'Unlock App')}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
          <span>{isZh ? '加密安全传输 • 端到端保护' : 'Encrypted & Secure Connection'}</span>
        </div>
      </div>
    </div>
  );
}
