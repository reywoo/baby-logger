import React from 'react';
import { Milk, Moon, Baby, HeartPulse, Activity, FileText, Zap, Ruler, Lock } from 'lucide-react';

export default function QuickLogButtons({ onSelectQuick, lang, t, birthDate, onOpenBirthdayModal }) {
  const isBirthdaySet = !!birthDate;

  const quickCategories = [
    {
      category: 'feeding',
      subCategory: 'formula',
      summaryEn: 'N/A',
      originalZh: 'N/A',
      notes: '',
      icon: <Milk style={{ color: 'var(--feeding-color)' }} size={24} />,
      labelZh: '喂养',
      labelEn: 'Feeding',
      subZh: '奶粉 • 母乳 • 辅食',
      subEn: 'Formula • Milk • Food',
      requiresBirthday: false,
    },
    {
      category: 'sleep',
      subCategory: 'nap',
      summaryEn: 'N/A',
      originalZh: 'N/A',
      notes: '',
      icon: <Moon style={{ color: 'var(--sleep-color)' }} size={24} />,
      labelZh: '睡眠',
      labelEn: 'Sleep',
      subZh: '午睡 • 小憩 • 夜间',
      subEn: 'Nap • Rest • Night',
      requiresBirthday: false,
    },
    {
      category: 'diaper',
      subCategory: 'wet',
      summaryEn: 'N/A',
      originalZh: 'N/A',
      notes: '',
      icon: <Baby style={{ color: 'var(--diaper-color)' }} size={24} />,
      labelZh: '换尿布',
      labelEn: 'Diaper',
      subZh: '小便 • 大便 • 混合',
      subEn: 'Pee • Poop (Bowel Movement) • Both',
      requiresBirthday: false,
    },
    {
      category: 'growth',
      subCategory: 'weight',
      summaryEn: 'N/A',
      originalZh: 'N/A',
      notes: '',
      icon: <Ruler style={{ color: '#10b981' }} size={24} />,
      labelZh: '生长发育',
      labelEn: 'Growth',
      subZh: '体重 • 身高',
      subEn: 'Weight (kg) • Height (cm)',
      requiresBirthday: true,
    },
    {
      category: 'health',
      subCategory: 'medicine',
      summaryEn: 'N/A',
      originalZh: 'N/A',
      notes: '',
      icon: <HeartPulse style={{ color: 'var(--health-color)' }} size={24} />,
      labelZh: '健康/用药',
      labelEn: 'Health',
      subZh: '体温 • 用药 • 疫苗',
      subEn: 'Meds • Temp • Vaccine',
      requiresBirthday: false,
    },
    {
      category: 'activity',
      subCategory: 'play',
      summaryEn: 'N/A',
      originalZh: 'N/A',
      notes: '',
      icon: <Activity style={{ color: '#ec4899' }} size={24} />,
      labelZh: '日常/游戏',
      labelEn: 'Activity',
      subZh: '趴卧 • 游戏 • 户外',
      subEn: 'Play • Tummy time • Outing',
      requiresBirthday: false,
    },
    {
      category: 'other',
      subCategory: 'other',
      summaryEn: 'N/A',
      originalZh: 'N/A',
      notes: '',
      icon: <FileText style={{ color: 'var(--primary-accent)' }} size={24} />,
      labelZh: '其他',
      labelEn: 'Other',
      subZh: '自由记录与备注',
      subEn: 'Custom notes & logs',
      requiresBirthday: false,
    },
  ];

  const handleCardClick = (cat) => {
    if (cat.requiresBirthday && !isBirthdaySet) {
      if (onOpenBirthdayModal) {
        onOpenBirthdayModal();
      } else {
        alert(lang === 'zh' ? '请先在顶部设置宝宝生日后，方可记录身高体重数据！' : "Please set the baby's birth date first before logging growth data!");
      }
      return;
    }
    onSelectQuick(cat);
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Zap size={16} style={{ color: 'var(--warning)' }} />
        {t.quickLogTitle || (lang === 'zh' ? '快捷分类记录' : 'Quick Category Log')}
      </h3>
      <div className="quick-grid">
        {quickCategories.map((cat, index) => {
          const disabled = cat.requiresBirthday && !isBirthdaySet;
          return (
            <div
              key={index}
              className={`quick-card ${disabled ? 'disabled-growth-card' : ''}`}
              onClick={() => handleCardClick(cat)}
              style={{
                position: 'relative',
                opacity: disabled ? 0.55 : 1,
                filter: disabled ? 'grayscale(0.6)' : 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              title={disabled ? (lang === 'zh' ? '需先设置宝宝生日才能解锁生长记录' : 'Set baby birthday to unlock growth log') : ''}
            >
              {cat.icon}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {lang === 'zh' ? cat.labelZh : cat.labelEn}
                  {disabled && <Lock size={13} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {disabled
                    ? (lang === 'zh' ? '🔒 需先输入生日解锁' : '🔒 Set birthday first')
                    : (lang === 'zh' ? cat.subZh : cat.subEn)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
