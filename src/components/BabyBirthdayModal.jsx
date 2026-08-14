import React, { useState, useRef } from 'react';
import { Cake, Calendar, X, Check, Loader2, Trash2, Camera, User, Heart, Sparkles } from 'lucide-react';

export default function BabyBirthdayModal({ babyProfile, currentBirthDate, onSave, onClose, lang = 'zh' }) {
  const isZh = lang === 'zh';

  const [birthDate, setBirthDate] = useState(babyProfile?.birthDate || currentBirthDate || '');
  const [firstName, setFirstName] = useState(babyProfile?.firstName || '');
  const [lastName, setLastName] = useState(babyProfile?.lastName || '');
  const [nickname, setNickname] = useState(babyProfile?.nickname || (babyProfile?.name !== 'Baby' ? babyProfile?.name : '') || '');
  const [gender, setGender] = useState(babyProfile?.gender || 'boy');
  const [avatarUrl, setAvatarUrl] = useState(babyProfile?.avatarUrl || '');
  
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(babyProfile?.avatarUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(isZh ? '请选择图片格式文件' : 'Please select an image file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError(isZh ? '图片大小不能超过 15MB' : 'Image size cannot exceed 15MB');
      return;
    }

    setSelectedPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const profileData = {
        birthDate: birthDate || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim(),
        gender,
        avatarUrl: photoPreview && !selectedPhotoFile ? photoPreview : avatarUrl,
      };

      await onSave(profileData, selectedPhotoFile);
      onClose();
    } catch (err) {
      setError(err.message || (isZh ? '保存失败' : 'Failed to save profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    const confirmMsg = isZh ? '确定要清空宝宝所有档案与生日信息吗？' : 'Are you sure you want to clear all baby profile data?';
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    setError('');
    try {
      await onSave({
        birthDate: null,
        firstName: '',
        lastName: '',
        nickname: '',
        gender: '',
        avatarUrl: null,
      }, null);
      onClose();
    } catch (err) {
      setError(err.message || (isZh ? '清除失败' : 'Failed to clear'));
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingData = !!(babyProfile?.birthDate || currentBirthDate || babyProfile?.firstName || babyProfile?.nickname || babyProfile?.avatarUrl);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 200,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.2s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(236, 72, 153, 0.18)',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98))',
          animation: 'modal-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
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
              flexShrink: 0,
            }}>
              <Cake size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {isZh ? '宝宝专属档案与生日' : "Baby Profile & Birthday"}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {isZh ? '完善宝宝档案，解锁成长阶段与月龄分析' : 'Personalize baby details & unlock age analysis'}
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

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.2rem',
            fontWeight: 600,
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* 1. Baby Photo Upload Avatar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 0',
          }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                cursor: 'pointer',
                border: '3px solid rgba(236, 72, 153, 0.5)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transition: 'transform 0.2s ease',
              }}
              title={isZh ? '点击上传宝宝照片' : 'Click to upload baby photo'}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Baby Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ec4899' }}>
                  <User size={36} />
                </div>
              )}

              {/* Camera Icon Overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                padding: '3px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                <Camera size={13} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-accent)',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginTop: '0.45rem',
                cursor: 'pointer',
              }}
            >
              {photoPreview ? (isZh ? '更换宝宝照片' : 'Change Photo') : (isZh ? '📷 上传宝宝照片' : '📷 Upload Photo')}
            </button>
          </div>

          {/* 2. Names Section (Nickname, First Name, Last Name) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {isZh ? '小名 / 昵称 (Nickname)' : 'Nickname'}
              </label>
              <input
                type="text"
                className="input-field"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={isZh ? '如：睿仔、豆豆...' : 'e.g. Leo, Bella...'}
                style={{ fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {isZh ? '名 (First Name)' : 'First Name'}
              </label>
              <input
                type="text"
                className="input-field"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={isZh ? '名...' : 'First name...'}
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              {isZh ? '姓氏 (Last Name)' : 'Last Name'}
            </label>
            <input
              type="text"
              className="input-field"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={isZh ? '姓氏...' : 'Last name...'}
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* 3. Gender Segmented Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
              {isZh ? '性别 (Gender)' : 'Gender'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setGender('boy')}
                className="glass-button"
                style={{
                  justifyContent: 'center',
                  padding: '0.55rem',
                  fontSize: '0.85rem',
                  background: gender === 'boy' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  borderColor: gender === 'boy' ? '#3b82f6' : 'var(--card-border)',
                  color: gender === 'boy' ? '#60a5fa' : 'var(--text-muted)',
                  fontWeight: gender === 'boy' ? 700 : 500,
                }}
              >
                👦 {isZh ? '男宝 Boy' : 'Boy'}
              </button>

              <button
                type="button"
                onClick={() => setGender('girl')}
                className="glass-button"
                style={{
                  justifyContent: 'center',
                  padding: '0.55rem',
                  fontSize: '0.85rem',
                  background: gender === 'girl' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  borderColor: gender === 'girl' ? '#ec4899' : 'var(--card-border)',
                  color: gender === 'girl' ? '#f472b6' : 'var(--text-muted)',
                  fontWeight: gender === 'girl' ? 700 : 500,
                }}
              >
                👧 {isZh ? '女宝 Girl' : 'Girl'}
              </button>

              <button
                type="button"
                onClick={() => setGender('other')}
                className="glass-button"
                style={{
                  justifyContent: 'center',
                  padding: '0.55rem',
                  fontSize: '0.85rem',
                  background: gender === 'other' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  borderColor: gender === 'other' ? '#8b5cf6' : 'var(--card-border)',
                  color: gender === 'other' ? '#a78bfa' : 'var(--text-muted)',
                  fontWeight: gender === 'other' ? 700 : 500,
                }}
              >
                🌟 {isZh ? '保密 Other' : 'Other'}
              </button>
            </div>
          </div>

          {/* 4. Birth Date Input */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              <Calendar size={14} style={{ color: '#ec4899' }} />
              {isZh ? '出生日期 (Birth Date)' : 'Birth Date'}
            </label>
            <input
              type="date"
              className="input-field"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                borderRadius: '0.85rem',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                colorScheme: 'dark',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', margin: '0.3rem 0 0 0' }}>
              {isZh ? '💡 输入生日后系统将自动在首页显示宝宝实时月龄与天数' : '💡 Automatically computes exact age in days & months'}
            </p>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hasExistingData ? (
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
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Trash2 size={14} />
                <span>{isZh ? '清空档案' : 'Clear Profile'}</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.6rem', marginLeft: 'auto' }}>
              <button
                type="button"
                className="glass-button"
                onClick={onClose}
                disabled={isSaving}
                style={{ padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                {isZh ? '取消' : 'Cancel'}
              </button>

              <button
                type="submit"
                className="glass-button"
                disabled={isSaving}
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  borderColor: 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.65rem 1.3rem',
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>{isZh ? '保存中...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{isZh ? '保存档案' : 'Save Profile'}</span>
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
