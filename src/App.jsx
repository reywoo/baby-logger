import React, { useState, useEffect } from 'react';
import { Mic, Clock, Download, Sparkles, Send, Plus, RefreshCw, Loader2, Timer, BookOpen, Cake, Calendar, Pencil } from 'lucide-react';
import LanguageToggle from './components/LanguageToggle';
import AudioRecorder from './components/AudioRecorder';
import QuickLogButtons from './components/QuickLogButtons';
import LogPreviewModal from './components/LogPreviewModal';
import TimelineFeed from './components/TimelineFeed';
import DataExport from './components/DataExport';
import PasscodeLock from './components/PasscodeLock';
import FeedingTimers from './components/FeedingTimers';
import NewbornTips from './components/NewbornTips';
import BabyBirthdayModal from './components/BabyBirthdayModal';
import ReywooLogo from './components/ReywooLogo';
import { calculateBabyAge } from './utils/ageUtils';

const translations = {
  zh: {
    appTitle: '家庭生活与育儿日志',
    appSubtitle: '语音智能识别 • 中英双语记录 • 自动解析',
    navVoice: '智能记录',
    navTimeline: '日志动态',
    navTimer: '喂养计时',
    navTips: '育儿指南',
    navExport: '数据导出',

    voiceTitle: '长按或点击说话',
    voiceSubtitle: '单次仅生成 1 条单项记录（例如：“宝宝下午2点喝了150ml牛奶”）。多项活动请分开录入。',
    startRecord: '开始录音',
    stopRecord: '停止录音',
    recording: '正在录音',
    tapToSpeak: '点击麦克风开始说话',
    tapToStop: '再按一下完成并解析',
    processingAudio: 'Gemini AI 正在解析语音',
    confirmLogTitle: '确认提取的数据',
    categoryLabel: '类别 Category',
    amountLabel: '奶量 / 数量 Amount',
    durationLabel: '时长 / 时间 Duration',
    chineseTextLabel: '中文原文 (Original Chinese)',
    englishTextLabel: '英文摘要 (English Summary)',
    notesLabel: '备注 Notes',
    cancelBtn: '取消',
    saveBtn: '确认保存',
    quickLogTitle: '快捷一键记录',
    totalMilk: '今日喝奶',
    totalSleep: '今日睡觉',
    totalDiaper: '今日尿布',
    times: '次',
    timelineTitle: '日志动态',
    noLogsYet: '暂无历史记录，点击麦克风说一句话试试吧！',
    textFallbackTitle: '文字打字输入',
    textFallbackPlaceholder: '或输入文字：“喝奶 120ml”...',
    exportTitle: '导出宝宝日志数据',
  },
  en: {
    appTitle: 'Family Assistant Log',
    appSubtitle: 'Voice AI Powered • Multilingual • Auto-Structured',
    navVoice: 'Smart Log',
    navTimeline: 'Log History',
    navTimer: 'Timers',
    navTips: 'Newborn Tips',
    navExport: 'Export Data',
    voiceTitle: 'Tap or Hold to Speak',
    voiceSubtitle: 'Each voice or text input creates 1 single log entry. Please log multiple events separately.',
    startRecord: 'Start Recording',
    stopRecord: 'Stop Recording',
    recording: 'Recording',
    tapToSpeak: 'Tap microphone to speak',
    tapToStop: 'Tap to stop & process',
    processingAudio: 'Gemini AI is analyzing audio',
    confirmLogTitle: 'Confirm Extracted Log',
    categoryLabel: 'Category',
    amountLabel: 'Amount (ml/oz)',
    durationLabel: 'Duration',
    chineseTextLabel: 'Chinese Text',
    englishTextLabel: 'English Summary',
    notesLabel: 'Notes',
    cancelBtn: 'Cancel',
    saveBtn: 'Confirm & Save',
    quickLogTitle: 'Quick One-Tap Log',
    totalMilk: 'Today Milk',
    totalSleep: 'Today Sleep',
    totalDiaper: 'Today Diapers',
    times: 'times',
    timelineTitle: 'Log History',
    noLogsYet: 'No logs recorded yet. Tap the microphone to record one!',
    textFallbackTitle: 'Type text log',
    textFallbackPlaceholder: 'Or type text: "Fed 120ml milk"...',
    exportTitle: 'Export Baby Logs Data',
  },
};


export default function App() {
  const [lang, setLang] = useState('zh'); // Default Chinese for parents
  const [activeTab, setActiveTab] = useState('voice');
  const [logs, setLogs] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [manualText, setManualText] = useState('');
  const [isProcessingText, setIsProcessingText] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('family_gemini_key') || '');
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('family_webhook_url') || '');

  // Auth & Passcode States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');

  // Baby Profile & Birthday State
  const [babyProfile, setBabyProfile] = useState(null);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);

  const t = translations[lang];

  // Utility to attach passcode header
  const getAuthHeaders = (extraHeaders = {}) => {
    const passcode = localStorage.getItem('APP_PASSCODE');
    return {
      ...extraHeaders,
      ...(passcode ? { 'x-app-passcode': passcode } : {}),
    };
  };

  const verifyPasscode = async (passcodeToTest) => {
    try {
      const headers = passcodeToTest ? { 'x-app-passcode': passcodeToTest } : getAuthHeaders();
      const res = await fetch('/api/auth/verify', { headers });
      if (res.ok) {
        if (passcodeToTest) {
          localStorage.setItem('APP_PASSCODE', passcodeToTest);
        }
        setIsAuthenticated(true);
        setAuthError('');
        return true;
      } else {
        setIsAuthenticated(false);
        setAuthError(lang === 'zh' ? '密码不正确，请重试' : 'Invalid passcode. Please try again.');
        return false;
      }
    } catch (err) {
      // If error (e.g. backend offline), allow UI render
      setIsAuthenticated(true);
      return true;
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // Check URL query parameter ?passcode=...
      const urlParams = new URLSearchParams(window.location.search);
      const urlPasscode = urlParams.get('passcode');
      if (urlPasscode) {
        localStorage.setItem('APP_PASSCODE', urlPasscode);
        // Strip ?passcode=... from URL bar seamlessly
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      }

      const isValid = await verifyPasscode();
      if (isValid) {
        fetchLogs();
        fetchBabyProfile();
      }
    };

    initAuth();
  }, []);

  const fetchBabyProfile = async () => {
    try {
      const res = await fetch('/api/baby-profile', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBabyProfile(data.profile || null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch baby profile:', err);
    }
  };

  const handleSaveBabyProfile = async (birthDate, name) => {
    const res = await fetch('/api/baby-profile', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ birthDate, name }),
    });
    const data = await res.json();
    if (data.success) {
      setBabyProfile(data.profile || null);
    } else {
      throw new Error(data.error || 'Failed to save birthday');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs', { headers: getAuthHeaders() });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch logs:', err);
    }
  };

  const handleAudioProcessed = (extractedData) => {
    setPreviewData(extractedData);
  };

  const handleSaveLogEntry = async (finalData, photos = [], removedAttachmentIds = []) => {
    try {
      let reqHeaders = getAuthHeaders();
      let bodyData;
      const isEdit = !!finalData.id;

      if (webhookUrl) {
        reqHeaders['x-google-sheet-webhook'] = webhookUrl;
      }

      if ((photos && photos.length > 0) || (removedAttachmentIds && removedAttachmentIds.length > 0)) {
        const formData = new FormData();
        formData.append('logData', JSON.stringify(finalData));
        if (removedAttachmentIds && removedAttachmentIds.length > 0) {
          formData.append('removedAttachmentIds', JSON.stringify(removedAttachmentIds));
        }
        photos.forEach((file) => {
          formData.append('photos', file);
        });
        bodyData = formData;
      } else {
        reqHeaders['Content-Type'] = 'application/json';
        bodyData = JSON.stringify({
          logData: finalData,
          removedAttachmentIds,
        });
      }

      const url = isEdit ? `/api/logs/${finalData.id}` : '/api/logs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: bodyData,
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const result = await res.json();
      if (result.success) {
        if (isEdit) {
          setLogs((prev) => prev.map((l) => (l.id === result.entry.id ? result.entry : l)));
        } else {
          setLogs((prev) => [result.entry, ...prev]);
          setActiveTab('timeline'); // Switch to timeline to show newly saved entry
        }
        setPreviewData(null);
      }
    } catch (err) {
      console.error('Save log error:', err);
    }
  };


  const handleDeleteLog = async (id) => {
    try {
      const res = await fetch(`/api/logs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleManualTextSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    const currentInput = manualText.trim();
    setIsProcessingText(true);

    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      if (apiKey) headers['x-gemini-api-key'] = apiKey;

      const res = await fetch('/api/process-text', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: currentInput }),
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const result = await res.json();
      if (result.success && result.data) {
        setPreviewData(result.data);
        setManualText('');
      } else {
        throw new Error(result.error || 'Text process failed');
      }
    } catch (err) {
      console.warn('Text processing error, opening fallback confirmation:', err);
      // Fallback: open modal confirmation so user is never stuck
      setPreviewData({
        category: 'feeding',
        subCategory: 'formula',
        amount: '',
        duration: '',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        summaryEn: currentInput,
        originalZh: currentInput,
        notes: '',
      });
      setManualText('');
    } finally {
      setIsProcessingText(false);
    }
  };


  const handleQuickSelect = (quickAction) => {
    setPreviewData(quickAction);
  };

  const handlePasscodeSubmit = async (code) => {
    const ok = await verifyPasscode(code);
    if (ok) {
      fetchLogs();
    }
  };

  if (isAuthChecking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasscodeLock onPasscodeSubmit={handlePasscodeSubmit} error={authError} lang={lang} />;
  }

  return (
    <div>
      {/* 1. Top Brand Header Banner (Mobile Optimized) */}
      <header className="glass-panel" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.55rem', padding: '0.65rem 0.85rem', gap: '0.5rem' }}>
        <ReywooLogo size={36} showText={true} />
        <div style={{ height: '22px', width: '1px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0, margin: '0 0.05rem' }} />
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <h1 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            🍼 {t.appTitle}
          </h1>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.appSubtitle}
          </p>
        </div>
      </header>

      {/* 2. Preferences & Controls Bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.55rem 1rem', background: 'rgba(15, 23, 42, 0.55)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {babyProfile?.birthDate ? (
            <button
              onClick={() => setIsBirthdayModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18), rgba(139, 92, 246, 0.18))',
                border: '1px solid rgba(236, 72, 153, 0.4)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title={lang === 'zh' ? '点击修改生日' : 'Click to edit birthday'}
            >
              <Cake size={16} style={{ color: '#ec4899' }} />
              <span>{calculateBabyAge(babyProfile.birthDate, lang)}</span>
              <Pencil size={13} style={{ color: 'var(--text-muted)', marginLeft: '0.15rem' }} />
            </button>
          ) : (
            <button
              onClick={() => setIsBirthdayModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                border: 'none',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <Cake size={16} />
              <span>{lang === 'zh' ? '🎂 设置生日' : '🎂 Set Birthday'}</span>
            </button>
          )}
        </div>

        <LanguageToggle lang={lang} setLang={setLang} />
      </div>

      {/* Main Tab Content */}
      <main>
        {activeTab === 'voice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Direct Audio to Gemini Component */}
            <AudioRecorder
              onAudioProcessed={handleAudioProcessed}
              lang={lang}
              apiKey={apiKey}
              t={t}
            />

            {/* Manual Text Input Fallback */}
            <form onSubmit={handleManualTextSubmit} className="glass-panel" style={{ padding: '0.9rem 1.1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t.textFallbackPlaceholder}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  disabled={isProcessingText}
                />
                <button
                  type="submit"
                  className="glass-button"
                  style={{ background: 'var(--primary-accent)', borderColor: 'var(--primary-accent)', padding: '0.75rem 1rem' }}
                  disabled={isProcessingText || !manualText.trim()}
                >
                  {isProcessingText ? <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                </button>
              </div>
            </form>

            {isProcessingText && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.75rem',
                padding: '0.6rem 1rem',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '0.75rem',
                color: 'var(--primary-accent)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <Sparkles size={16} />
                <span>{lang === 'zh' ? 'Gemini AI 正在解析文本...' : 'Gemini AI is parsing text input...'}</span>
              </div>
            )}

            {/* Quick One-Tap Action Buttons */}
            <QuickLogButtons
              onSelectQuick={handleQuickSelect}
              lang={lang}
              t={t}
              birthDate={babyProfile?.birthDate}
              onOpenBirthdayModal={() => setIsBirthdayModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'timeline' && (
          <TimelineFeed
            logs={logs}
            onEditLog={(logToEdit) => setPreviewData(logToEdit)}
            onDeleteLog={handleDeleteLog}
            lang={lang}
            t={t}
          />
        )}


        {activeTab === 'timer' && (
          <FeedingTimers
            onOpenFeedingModal={(feedingData) => setPreviewData(feedingData)}
            getAuthHeaders={getAuthHeaders}
            lang={lang}
          />
        )}

        {activeTab === 'tips' && (
          <NewbornTips lang={lang} />
        )}

        {activeTab === 'export' && (
          <DataExport
            logs={logs}
            lang={lang}
            getAuthHeaders={getAuthHeaders}
          />
        )}
      </main>

      {/* Log Confirmation Modal */}
      {previewData && (
        <LogPreviewModal
          data={previewData}
          onSave={handleSaveLogEntry}
          onClose={() => setPreviewData(null)}
          lang={lang}
          t={t}
          birthDate={babyProfile?.birthDate}
        />
      )}

      {/* Baby Birthday Modal */}
      {isBirthdayModalOpen && (
        <BabyBirthdayModal
          currentBirthDate={babyProfile?.birthDate}
          onSave={handleSaveBabyProfile}
          onClose={() => setIsBirthdayModalOpen(false)}
          lang={lang}
        />
      )}

      {/* Fixed Bottom Nav Bar */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <Sparkles size={20} />
          <span>{t.navVoice}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <Clock size={20} />
          <span>{t.navTimeline}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          <Timer size={20} />
          <span>{t.navTimer}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'tips' ? 'active' : ''}`}
          onClick={() => setActiveTab('tips')}
        >
          <BookOpen size={20} />
          <span>{t.navTips}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Download size={20} />
          <span>{t.navExport}</span>
        </button>
      </nav>


    </div>
  );
}
