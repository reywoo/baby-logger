import React from 'react';
import { Milk, Moon, Baby, HeartPulse, Activity, FileText, Zap } from 'lucide-react';

export default function QuickLogButtons({ onSelectQuick, lang, t }) {
  const quickCategories = [
    {
      category: 'feeding',
      subCategory: 'formula',
      summaryEn: 'Feeding log',
      originalZh: '喂奶记录',
      icon: <Milk style={{ color: 'var(--feeding-color)' }} size={24} />,
      labelZh: '喂养 (Feeding)',
      labelEn: 'Feeding',
      subZh: '奶粉 • 母乳 • 辅食',
      subEn: 'Formula • Milk • Food',
    },
    {
      category: 'sleep',
      subCategory: 'nap',
      summaryEn: 'Sleep log',
      originalZh: '睡眠记录',
      icon: <Moon style={{ color: 'var(--sleep-color)' }} size={24} />,
      labelZh: '睡眠 (Sleep)',
      labelEn: 'Sleep',
      subZh: '午睡 • 小憩 • 夜间',
      subEn: 'Nap • Rest • Night',
    },
    {
      category: 'diaper',
      subCategory: 'wet',
      summaryEn: 'Diaper change log',
      originalZh: '换尿布记录',
      icon: <Baby style={{ color: 'var(--diaper-color)' }} size={24} />,
      labelZh: '换尿布 (Diaper)',
      labelEn: 'Diaper',
      subZh: '小便 (Pee) • 大便 (Poop) • 混合',
      subEn: 'Pee • Poop (Bowel Movement) • Both',

    },
    {
      category: 'health',
      subCategory: 'medicine',
      summaryEn: 'Health / Medicine log',
      originalZh: '健康/用药记录',
      icon: <HeartPulse style={{ color: 'var(--health-color)' }} size={24} />,
      labelZh: '健康/用药 (Health)',
      labelEn: 'Health',
      subZh: '体温 • 用药 • 疫苗',
      subEn: 'Meds • Temp • Vaccine',
    },
    {
      category: 'activity',
      subCategory: 'play',
      summaryEn: 'Activity log',
      originalZh: '日常活动与游戏',
      icon: <Activity style={{ color: '#ec4899' }} size={24} />,
      labelZh: '日常/游戏 (Activity)',
      labelEn: 'Activity',
      subZh: '趴卧 • 游戏 • 户外',
      subEn: 'Play • Tummy time • Outing',
    },
    {
      category: 'other',
      subCategory: 'other',
      summaryEn: 'Other log',
      originalZh: '其他记录',
      icon: <FileText style={{ color: 'var(--primary-accent)' }} size={24} />,
      labelZh: '其他 (Other)',
      labelEn: 'Other',
      subZh: '自由记录与备注',
      subEn: 'Custom notes & logs',
    },
  ];

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Zap size={16} style={{ color: 'var(--warning)' }} />
        {t.quickLogTitle || (lang === 'zh' ? '快捷分类记录' : 'Quick Category Log')}
      </h3>
      <div className="quick-grid">
        {quickCategories.map((cat, index) => (
          <div
            key={index}
            className="quick-card"
            onClick={() => onSelectQuick(cat)}
          >
            {cat.icon}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {lang === 'zh' ? cat.labelZh : cat.labelEn}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {lang === 'zh' ? cat.subZh : cat.subEn}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

