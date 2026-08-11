import React, { useState } from 'react';
import { Cake, Calendar, X, Check, Loader2, Trash2 } from 'lucide-react';

export default function BabyBirthdayModal({ currentBirthDate, onSave, onClose, lang }) {
  const [birthDate, setBirthDate] = useState(currentBirthDate || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!birthDate) {
      setError(lang === 'zh' ? '请选择出生日期' : 'Please select a birth date');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onSave(birthDate, 'Baby');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save birthday');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    setError('');
    try {
      await onSave(null, 'Baby');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to clear birthday');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 200,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '92%',
          padding: '1.75rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(236, 72, 153, 0.15)',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
          animation: 'modal-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
              flexShrink: 0
            }}>
              <Cake size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {lang === 'zh' ? '设置宝宝生日' : "Set Baby's Birthday"}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                {lang === 'zh' ? '保存后自动计算月龄并解锁生长发育记录' : 'Calculates age & unlocks Growth logs'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '1.2rem',
              fontWeight: 600
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              <Calendar size={16} style={{ color: '#ec4899' }} />
              {lang === 'zh' ? '出生日期 (Birth Date)' : 'Birth Date'}
            </label>
            <input
              type="date"
              className="input-field"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                fontSize: '1rem',
                borderRadius: '0.85rem',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                colorScheme: 'dark',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
              }}
              required={!currentBirthDate}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            {currentBirthDate ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  borderRadius: '0.75rem',
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Trash2 size={14} />
                <span>{lang === 'zh' ? '清除/重置生日' : 'Clear Birthday'}</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                className="glass-button"
                onClick={onClose}
                disabled={isSaving}
                style={{ padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>

              <button
                type="submit"
                className="glass-button"
                disabled={isSaving || !birthDate}
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  borderColor: 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.65rem 1.3rem',
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                  opacity: (isSaving || !birthDate) ? 0.6 : 1,
                  cursor: (isSaving || !birthDate) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>{lang === 'zh' ? '保存中...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{lang === 'zh' ? '保存日期' : 'Save Birthday'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
