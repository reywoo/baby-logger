import React from 'react';
import { Languages } from 'lucide-react';

export default function LanguageToggle({ lang, setLang }) {
  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="glass-button"
      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
      title="Toggle Language / 切换语言"
    >
      <Languages size={16} />
      <span>{lang === 'zh' ? '中文' : 'EN'}</span>
    </button>
  );
}
