import React, { useState } from 'react';
import { Sheet, Key, Save, Check, ExternalLink } from 'lucide-react';

export default function GoogleSheetSetup({ apiKey, setApiKey, webhookUrl, setWebhookUrl, lang, t }) {
  const [tempKey, setTempKey] = useState(apiKey || '');
  const [tempWebhook, setTempWebhook] = useState(webhookUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = () => {
    setApiKey(tempKey);
    setWebhookUrl(tempWebhook);
    localStorage.setItem('family_gemini_key', tempKey);
    localStorage.setItem('family_webhook_url', tempWebhook);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sheet size={20} style={{ color: 'var(--primary-accent)' }} />
        {t.settingsTitle}
      </h3>

      {/* Gemini API Key */}
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <Key size={16} /> {t.apiKeyLabel}
        </label>
        <input
          type="password"
          className="input-field"
          placeholder="AIzaSy..."
          value={tempKey}
          onChange={(e) => setTempKey(e.target.value)}
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          {lang === 'zh' ? '从 Google AI Studio (aistudio.google.com) 获取免费 API Key' : 'Get free API Key from Google AI Studio (aistudio.google.com)'}
        </div>
      </div>

      {/* Google Sheet Webhook */}
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <Sheet size={16} /> {t.webhookLabel}
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={tempWebhook}
          onChange={(e) => setTempWebhook(e.target.value)}
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          {lang === 'zh' ? 'Google Apps Script Webhook URL（可选，自动同步记录到 Google 表格）' : 'Google Apps Script Webhook URL (Optional, auto-syncs logs to Google Sheet)'}
        </div>
      </div>

      <button
        onClick={handleSaveSettings}
        className="glass-button"
        style={{ justifyContent: 'center', background: 'var(--primary-accent)', borderColor: 'var(--primary-accent)', marginTop: '0.5rem' }}
      >
        {savedSuccess ? <Check size={18} /> : <Save size={18} />}
        {savedSuccess ? (lang === 'zh' ? '已保存！' : 'Saved!') : t.saveSettingsBtn}
      </button>

      {/* Guide Note */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
        <strong style={{ color: 'var(--text-main)' }}>💡 {lang === 'zh' ? '使用说明' : 'Instructions'}:</strong>
        <br />
        1. {lang === 'zh' ? '点击主页大麦克风图标直接说话（支持中文、粤语、英文及混合方言）。' : 'Tap the giant mic on the main page to speak (supports Chinese, English, dialects).'}
        <br />
        2. Gemini 1.5 Flash {lang === 'zh' ? '直接提取语音中的时间、项目、毫升数并完成中英双语翻译。' : 'directly listens to the audio and extracts structured fields + bilingual notes.'}
        <br />
        3. {lang === 'zh' ? '本地 Docker 容器已持久化保存所有记录。' : 'All logs are saved locally inside your Docker container database.'}
      </div>
    </div>
  );
}
