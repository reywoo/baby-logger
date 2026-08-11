import React, { useState, useEffect } from 'react';
import { Play, Square, FileText, RotateCcw, AlertTriangle, ShieldCheck, Milk, Moon, Lock, Plus } from 'lucide-react';

export default function FeedingTimers({ onOpenFeedingModal, getAuthHeaders, lang = 'zh' }) {
  const [timersState, setTimersState] = useState({
    feedingSession: { id: 'active_session', status: 'idle', sessionType: 'feeding', startTime: null, endTime: null, expiresAt: null },
    openedBottles: [],
  });

  const [activeSessionType, setActiveSessionType] = useState('feeding');
  const [selectedBottleType, setSelectedBottleType] = useState('237ml');
  const [now, setNow] = useState(new Date());
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bottleToDelete, setBottleToDelete] = useState(null);

  // 1-second ticker for smooth timer display
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll backend every 5 seconds for multi-device sync
  const fetchTimers = async () => {
    try {
      const res = await fetch('/api/timers', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTimersState({
            feedingSession: data.feedingSession || { id: 'active_session', status: 'idle', sessionType: 'feeding' },
            openedBottles: data.openedBottles || [],
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch timers state:', err);
    }
  };

  useEffect(() => {
    fetchTimers();
    const pollInterval = setInterval(fetchTimers, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const session = timersState.feedingSession || { status: 'idle', sessionType: 'feeding' };
  const isSessionRunningOrEnded = session.status !== 'idle';
  const currentSessionType = session.status !== 'idle' ? (session.sessionType || 'feeding') : activeSessionType;

  // Keep activeSessionType synced with active/ended backend session
  useEffect(() => {
    if (session.sessionType && session.status !== 'idle') {
      setActiveSessionType(session.sessionType);
    }
  }, [session.sessionType, session.status]);

  // Session Handlers
  const handleStartSession = async () => {
    setIsActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/timers/feeding/start', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sessionType: activeSessionType }),
      });
      const data = await res.json();
      if (data.success) {
        setTimersState((prev) => ({ ...prev, feedingSession: data.session }));
      } else {
        setErrorMsg(data.error || 'Failed to start session');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStopSession = async () => {
    setIsActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/timers/feeding/stop', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      if (data.success) {
        setTimersState((prev) => ({ ...prev, feedingSession: data.session }));
      } else {
        setErrorMsg(data.error || 'Failed to stop session');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetSession = async () => {
    setIsActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/timers/feeding/reset', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      if (data.success) {
        setTimersState((prev) => ({ ...prev, feedingSession: data.session }));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateRecordFromSession = () => {
    if (!session || !session.startTime) return;

    const startTimeIso = session.startTime;
    const endTimeIso = session.endTime || new Date().toISOString();

    const startObj = new Date(startTimeIso);
    const endObj = new Date(endTimeIso);
    const diffMs = Math.max(0, endObj.getTime() - startObj.getTime());
    const durationMins = Math.round(diffMs / (1000 * 60));

    let durationStr = `${durationMins} mins`;
    if (durationMins >= 60) {
      const hrs = Math.floor(durationMins / 60);
      const mins = durationMins % 60;
      durationStr = mins > 0 ? `${hrs} hr ${mins} mins` : `${hrs} hr`;
    }

    if (currentSessionType === 'sleep') {
      onOpenFeedingModal({
        category: 'sleep',
        subCategory: 'nap',
        startTime: startTimeIso,
        endTime: endTimeIso,
        duration: durationStr,
        amount: '',
        summaryEn: 'Sleep session log',
        originalZh: '宝宝睡眠记录',
        notes: '',
      });
    } else {
      onOpenFeedingModal({
        category: 'feeding',
        subCategory: 'formula',
        startTime: startTimeIso,
        endTime: endTimeIso,
        duration: durationStr,
        amount: '',
        summaryEn: 'Formula feeding session',
        originalZh: '配方奶喂养记录',
        notes: '',
      });
    }
  };

  // Bottle Expiry Handlers
  const handleOpenBottle = async () => {
    setIsActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/timers/bottles/open', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ bottleType: selectedBottleType }),
      });
      const data = await res.json();
      if (data.success && data.bottle) {
        setTimersState((prev) => ({
          ...prev,
          openedBottles: [data.bottle, ...prev.openedBottles],
        }));
      } else {
        setErrorMsg(data.error || 'Failed to open bottle');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFinishBottle = async (bottleId) => {
    try {
      const res = await fetch(`/api/timers/bottles/${bottleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setTimersState((prev) => ({
          ...prev,
          openedBottles: prev.openedBottles.filter((b) => b.id !== bottleId),
        }));
      }
    } catch (err) {
      console.warn('Finish bottle error:', err);
    }
  };

  // Time formatting helpers
  let sessionSecondsRemaining = 0;
  let sessionPercentElapsed = 0;
  if (currentSessionType === 'feeding' && session.status === 'active' && session.expiresAt) {
    const expiresAtMs = new Date(session.expiresAt).getTime();
    const startMs = new Date(session.startTime).getTime();
    const totalMs = expiresAtMs - startMs;
    const remainingMs = expiresAtMs - now.getTime();

    sessionSecondsRemaining = Math.max(0, Math.floor(remainingMs / 1000));
    sessionPercentElapsed = Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100));
  }

  let sleepElapsedSeconds = 0;
  if (currentSessionType === 'sleep' && session.startTime) {
    const startMs = new Date(session.startTime).getTime();
    const endMs = session.endTime ? new Date(session.endTime).getTime() : now.getTime();
    sleepElapsedSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
  }

  const formatMmSs = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatHhMmSs = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimeStr = (isoStr) => {
    if (!isoStr) return '--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateBottleRemaining = (expiresAtIso, openedAtIso) => {
    if (!expiresAtIso || !openedAtIso) return { text: '--', percentLeft: 100, isExpired: false };
    const expiresMs = new Date(expiresAtIso).getTime();
    const openedMs = new Date(openedAtIso).getTime();
    const totalDurationMs = expiresMs - openedMs;
    const remainingMs = expiresMs - now.getTime();

    if (remainingMs <= 0) {
      return { text: lang === 'zh' ? '已过期' : 'Expired', percentLeft: 0, isExpired: true };
    }

    const totalHoursLeft = Math.floor(remainingMs / (1000 * 60 * 60));
    const minsLeft = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const percentLeft = Math.min(100, Math.max(0, (remainingMs / totalDurationMs) * 100));

    let text = `${totalHoursLeft}h ${minsLeft}m`;
    if (lang === 'zh') {
      text = `剩余 ${totalHoursLeft}小时${minsLeft}分`;
    }
    return { text, percentLeft, isExpired: false };
  };

  const activeBottlesCount = timersState.openedBottles.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Title Banner */}
      <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', background: 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(139,92,246,0.15) 100%)', borderColor: 'rgba(236,72,153,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(236,72,153,0.4)' }}>
            <Milk size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
              {lang === 'zh' ? '喂养与睡眠计时器' : 'Session & Expiry Timers'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '喂养/睡眠实时计时 • 水奶开封冷藏保鲜' : 'Feeding/Sleep timers • RTF bottle fridge expiry tracking'}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Session Timer Card (Feeding vs Sleeping) */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Toggle Pill Bar (Matching Screenshot 2 Pill style) */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '0.85rem',
          padding: '0.25rem',
          border: '1px solid var(--card-border)',
          marginBottom: '1.1rem',
        }}>
          <button
            type="button"
            onClick={() => !isSessionRunningOrEnded && setActiveSessionType('feeding')}
            disabled={isSessionRunningOrEnded}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '0.65rem',
              border: activeSessionType === 'feeding' ? '1.5px solid #ec4899' : '1px solid transparent',
              background: activeSessionType === 'feeding'
                ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)'
                : 'transparent',
              color: activeSessionType === 'feeding' ? '#fff' : 'var(--text-muted)',
              fontWeight: activeSessionType === 'feeding' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: isSessionRunningOrEnded ? 'not-allowed' : 'pointer',
              opacity: isSessionRunningOrEnded && activeSessionType !== 'feeding' ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
            title={isSessionRunningOrEnded ? (lang === 'zh' ? '计时进行中，无法切换' : 'Session in progress') : ''}
          >
            <Milk size={16} style={{ color: activeSessionType === 'feeding' ? '#f472b6' : 'currentColor' }} />
            <span>{lang === 'zh' ? '冲奶喂养 (Feeding)' : 'Feeding Session'}</span>
            {isSessionRunningOrEnded && activeSessionType !== 'feeding' && <Lock size={12} />}
          </button>

          <button
            type="button"
            onClick={() => !isSessionRunningOrEnded && setActiveSessionType('sleep')}
            disabled={isSessionRunningOrEnded}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '0.65rem',
              border: activeSessionType === 'sleep' ? '1.5px solid #8b5cf6' : '1px solid transparent',
              background: activeSessionType === 'sleep'
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)'
                : 'transparent',
              color: activeSessionType === 'sleep' ? '#fff' : 'var(--text-muted)',
              fontWeight: activeSessionType === 'sleep' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: isSessionRunningOrEnded ? 'not-allowed' : 'pointer',
              opacity: isSessionRunningOrEnded && activeSessionType !== 'sleep' ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
            title={isSessionRunningOrEnded ? (lang === 'zh' ? '计时进行中，无法切换' : 'Session in progress') : ''}
          >
            <Moon size={16} style={{ color: activeSessionType === 'sleep' ? '#a78bfa' : 'currentColor' }} />
            <span>{lang === 'zh' ? '睡眠计时 (Sleeping)' : 'Sleeping Session'}</span>
            {isSessionRunningOrEnded && activeSessionType !== 'sleep' && <Lock size={12} />}
          </button>
        </div>

        {/* Section Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
            {currentSessionType === 'feeding' ? (
              <>🍼 {lang === 'zh' ? '冲奶喂养计时 (固定1小时)' : 'Feeding Session (Fixed 1-Hour)'}</>
            ) : (
              <>💤 {lang === 'zh' ? '宝宝睡眠计时 (无上限正计时)' : 'Sleeping Session (Elapsed Timer)'}</>
            )}
          </h3>
        </div>

        {/* State 1: IDLE */}
        {session.status === 'idle' && (
          <div style={{ textAlign: 'center', padding: '1.2rem 0.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
              {activeSessionType === 'feeding'
                ? (lang === 'zh' ? '倒入奶瓶准备喂养后，点击“开始喂养”。系统将开启 1 小时配方奶保质倒计时。' : 'Click "Start Feeding" when formula is poured. Starts fixed 1-hour formula freshness timer.')
                : (lang === 'zh' ? '宝宝入睡时，点击“开始睡眠”。系统将实时正计时记录睡眠累计时长。' : 'Click "Start Sleeping" when baby falls asleep. Tracks exact elapsed sleep duration.')}
            </div>

            <button
              onClick={handleStartSession}
              disabled={isActionLoading}
              className="glass-button"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.9rem',
                fontSize: '1rem',
                fontWeight: 700,
                background: activeSessionType === 'feeding'
                  ? 'linear-gradient(135deg, #ec4899 0%, #6366f1 100%)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                borderColor: activeSessionType === 'feeding' ? 'rgba(236,72,153,0.5)' : 'rgba(139,92,246,0.5)',
                boxShadow: activeSessionType === 'feeding'
                  ? '0 6px 20px rgba(236,72,153,0.35)'
                  : '0 6px 20px rgba(139,92,246,0.35)',
              }}
            >
              <Play size={20} fill="#fff" />
              <span>
                {activeSessionType === 'feeding'
                  ? (lang === 'zh' ? '开始喂养 (Start Feeding)' : 'Start Feeding Session')
                  : (lang === 'zh' ? '开始睡眠 (Start Sleeping)' : 'Start Sleeping Session')}
              </span>
            </button>
          </div>
        )}

        {/* State 2: ACTIVE */}
        {session.status === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Status Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: currentSessionType === 'feeding' ? '#38bdf8' : '#a78bfa', fontWeight: 600 }}>
                <span className="spin" style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentSessionType === 'feeding' ? '#38bdf8' : '#a78bfa', display: 'inline-block' }}></span>
                <span>
                  {currentSessionType === 'feeding'
                    ? (lang === 'zh' ? '喂养进行中' : 'Feeding in Progress')
                    : (lang === 'zh' ? '睡眠进行中 (睡觉中...)' : 'Sleep in Progress')}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lang === 'zh' ? '开始于: ' : 'Started: '} {formatTimeStr(session.startTime)}
              </div>
            </div>

            {/* Timer Clock */}
            {currentSessionType === 'feeding' ? (
              <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '2px', color: sessionSecondsRemaining < 600 ? '#f43f5e' : '#fff' }}>
                  {formatMmSs(sessionSecondsRemaining)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {lang === 'zh' ? '冲奶1小时保质剩余时间' : 'Formula expiry countdown remaining'}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '2px', color: '#c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Moon size={32} style={{ color: '#8b5cf6', animation: 'pulse 2s infinite ease-in-out' }} />
                  <span>{formatHhMmSs(sleepElapsedSeconds)}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {lang === 'zh' ? '已持续睡眠时间' : 'Total elapsed sleep duration'}
                </div>
              </div>
            )}

            {/* Progress Bar for Feeding */}
            {currentSessionType === 'feeding' && (
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${100 - sessionPercentElapsed}%`,
                    background: sessionSecondsRemaining < 600 ? 'linear-gradient(90deg, #f43f5e, #ef4444)' : 'linear-gradient(90deg, #ec4899, #6366f1)',
                    transition: 'width 1s linear',
                  }}
                />
              </div>
            )}

            {/* Stop Action Button */}
            <button
              onClick={handleStopSession}
              disabled={isActionLoading}
              className="glass-button"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
                borderColor: 'rgba(239,68,68,0.5)',
                boxShadow: '0 6px 18px rgba(239,68,68,0.3)',
                marginTop: '0.5rem',
              }}
            >
              <Square size={18} fill="#fff" />
              <span>
                {currentSessionType === 'feeding'
                  ? (lang === 'zh' ? '停止喂养 (Stop Feeding)' : 'Stop Feeding Session')
                  : (lang === 'zh' ? '结束睡眠 (End Sleeping)' : 'End Sleeping Session')}
              </span>
            </button>
          </div>
        )}

        {/* State 3: ENDED */}
        {session.status === 'ended' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.85rem',
                background: session.reason === 'expired' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                border: session.reason === 'expired' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              {session.reason === 'expired' ? <AlertTriangle color="#f59e0b" size={20} /> : <ShieldCheck color="#10b981" size={20} />}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                  {currentSessionType === 'feeding'
                    ? (session.reason === 'expired'
                        ? (lang === 'zh' ? '冲奶1小时保质已到期' : 'Feeding session timer expired (1 hr)')
                        : (lang === 'zh' ? '喂养已结束' : 'Feeding Session Completed'))
                    : (lang === 'zh' ? `睡眠已结束 (${formatHhMmSs(sleepElapsedSeconds)})` : `Sleep Session Ended (${formatHhMmSs(sleepElapsedSeconds)})`)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {formatTimeStr(session.startTime)} - {formatTimeStr(session.endTime)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                onClick={handleCreateRecordFromSession}
                className="glass-button"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  background: currentSessionType === 'sleep'
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderColor: 'rgba(99,102,241,0.5)',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                }}
              >
                <FileText size={18} />
                <span>
                  {currentSessionType === 'sleep'
                    ? (lang === 'zh' ? '填报睡眠记录 (Create Sleeping Record)' : 'Create Sleeping Record')
                    : (lang === 'zh' ? '填报喂奶记录 (Create Feeding Record)' : 'Create Feeding Record')}
                </span>
              </button>

              <button
                onClick={handleResetSession}
                disabled={isActionLoading}
                className="glass-button"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.65rem',
                  fontSize: '0.85rem',
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'var(--text-muted)',
                }}
              >
                <RotateCcw size={16} />
                <span>{lang === 'zh' ? '重置 / 开始新计时' : 'Reset / Start New Session'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature 2: Ready-To-Feed Opened Bottle Expiry Countdowns */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🍾 {lang === 'zh' ? '水奶开封保鲜' : 'Ready-To-Feed Opened Expiry'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '冷藏保鲜 (237ml保质48h / 59ml保质24h)' : 'Fridge storage (237ml: 48h / 59ml: 24h)'}
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: activeBottlesCount >= 5 ? '#f43f5e' : 'var(--text-muted)', fontWeight: 600 }}>
            {activeBottlesCount}/5 {lang === 'zh' ? '已开封' : 'Opened'}
          </span>
        </div>

        {/* Bottle Selection Switcher (Screenshot 2) */}
        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', borderRadius: '0.85rem', padding: '0.25rem', border: '1px solid var(--card-border)', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setSelectedBottleType('237ml')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '0.65rem',
              border: selectedBottleType === '237ml' ? '1.5px solid var(--primary-accent)' : '1px solid transparent',
              background: selectedBottleType === '237ml' ? 'var(--primary-accent)' : 'transparent',
              color: selectedBottleType === '237ml' ? '#fff' : 'var(--text-muted)',
              fontWeight: selectedBottleType === '237ml' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            237ml (48h)
          </button>

          <button
            type="button"
            onClick={() => setSelectedBottleType('59ml')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '0.65rem',
              border: selectedBottleType === '59ml' ? '1.5px solid var(--primary-accent)' : '1px solid transparent',
              background: selectedBottleType === '59ml' ? 'var(--primary-accent)' : 'transparent',
              color: selectedBottleType === '59ml' ? '#fff' : 'var(--text-muted)',
              fontWeight: selectedBottleType === '59ml' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            59ml (24h)
          </button>
        </div>

        <button
          onClick={handleOpenBottle}
          disabled={isActionLoading || activeBottlesCount >= 5}
          className="glass-button"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '0.85rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: activeBottlesCount >= 5 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            borderColor: activeBottlesCount >= 5 ? 'var(--card-border)' : 'rgba(16,185,129,0.5)',
            boxShadow: activeBottlesCount >= 5 ? 'none' : '0 4px 15px rgba(16,185,129,0.3)',
            opacity: activeBottlesCount >= 5 ? 0.5 : 1,
            cursor: activeBottlesCount >= 5 ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={18} />
          <span>
            {activeBottlesCount >= 5
              ? (lang === 'zh' ? '已达上限 (最多5瓶)' : 'Limit Reached (Max 5 Bottles)')
              : (lang === 'zh' ? `新开封1瓶 ${selectedBottleType}` : `Open New ${selectedBottleType} Bottle`)}
          </span>
        </button>

        {/* Opened Bottles List */}
        {timersState.openedBottles.length > 0 && (
          <div style={{ marginTop: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {lang === 'zh' ? '开封冷藏中:' : 'Currently opened in fridge:'}
            </div>

            {timersState.openedBottles.map((bottle) => {
              const remainingInfo = calculateBottleRemaining(bottle.expiresAt, bottle.openedAt);

              return (
                <div
                  key={bottle.id}
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: '0.75rem',
                    background: remainingInfo.isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                    border: remainingInfo.isExpired ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--card-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                        🍼 {bottle.bottleType}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ({lang === 'zh' ? '开封于' : 'opened'} {formatTimeStr(bottle.openedAt)})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: remainingInfo.isExpired ? '#f87171' : '#34d399' }}>
                        {remainingInfo.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBottleToDelete(bottle)}
                        style={{
                          background: 'rgba(239,68,68,0.15)',
                          border: 'none',
                          color: '#f87171',
                          borderRadius: '0.4rem',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {lang === 'zh' ? '喝完/弃用' : 'Finish'}
                      </button>
                    </div>
                  </div>

                  {/* Expiry Progress Bar */}
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${remainingInfo.percentLeft}%`,
                        background: remainingInfo.isExpired
                          ? '#ef4444'
                          : remainingInfo.percentLeft < 25
                          ? '#f59e0b'
                          : '#10b981',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Bottle Modal Overlay */}
      {bottleToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="glass-panel modal-content" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '1.75rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#10b981' }}>
              <Milk size={44} />
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
              {lang === 'zh' ? '确认完成此瓶水奶？' : 'Confirm Finish Bottle?'}
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {lang === 'zh' ? `确认将 ${bottleToDelete.bottleType} 水奶标注为已喝完或丢弃？` : `Mark ${bottleToDelete.bottleType} bottle as empty/discarded?`}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setBottleToDelete(null)}
                className="glass-button"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <span>{lang === 'zh' ? '取消' : 'Cancel'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleFinishBottle(bottleToDelete.id);
                  setBottleToDelete(null);
                }}
                className="glass-button"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: '#10b981',
                  borderColor: '#10b981',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                <span>{lang === 'zh' ? '确认喝完' : 'Confirm Finish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
