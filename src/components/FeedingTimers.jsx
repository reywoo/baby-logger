import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, FileText, RotateCcw, Plus, Trash2, Clock, AlertTriangle, ShieldCheck, Milk } from 'lucide-react';

export default function FeedingTimers({ onOpenFeedingModal, getAuthHeaders, lang = 'zh' }) {
  const [timersState, setTimersState] = useState({
    feedingSession: { id: 'active_session', status: 'idle', startTime: null, endTime: null, expiresAt: null },
    openedBottles: [],
  });

  const [selectedBottleType, setSelectedBottleType] = useState('237ml');
  const [now, setNow] = useState(new Date());
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1-second ticker for smooth countdown display
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
            feedingSession: data.feedingSession || { id: 'active_session', status: 'idle' },
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

  // Feature 1 Handlers
  const handleStartFeeding = async () => {
    setIsActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/timers/feeding/start', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      if (data.success) {
        setTimersState((prev) => ({ ...prev, feedingSession: data.session }));
      } else {
        setErrorMsg(data.error || 'Failed to start timer');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStopFeeding = async () => {
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
        setErrorMsg(data.error || 'Failed to stop timer');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetFeeding = async () => {
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
    const session = timersState.feedingSession;
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
  };

  // Feature 2 Handlers
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

  // Helper calculation functions
  const session = timersState.feedingSession || { status: 'idle' };

  // Calculate session active countdown
  let sessionSecondsRemaining = 0;
  let sessionPercentElapsed = 0;
  if (session.status === 'active' && session.expiresAt) {
    const expiresAtMs = new Date(session.expiresAt).getTime();
    const startMs = new Date(session.startTime).getTime();
    const totalMs = expiresAtMs - startMs;
    const remainingMs = expiresAtMs - now.getTime();

    sessionSecondsRemaining = Math.max(0, Math.floor(remainingMs / 1000));
    sessionPercentElapsed = Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100));
  }

  const formatMmSs = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimeStr = (isoStr) => {
    if (!isoStr) return '--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTimeStr = (isoStr) => {
    if (!isoStr) return '--';
    const d = new Date(isoStr);
    const isToday = d.toDateString() === new Date().toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `${lang === 'zh' ? '今天' : 'Today'} ${timeStr}` : `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`;
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
      <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', background: 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(99,102,241,0.15) 100%)', borderColor: 'rgba(236,72,153,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(236,72,153,0.4)' }}>
            <Milk size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
              {lang === 'zh' ? '喂养与保鲜倒计时' : 'Feeding & Expiry Timers'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '冲奶1小时保质提醒 • Ready-To-Feed 开封冷藏保鲜' : 'Prepared bottle 1h timer • RTF bottle fridge expiry tracking'}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Feature 1: Feeding Session Timer (1-Hour Expiration) */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
            🍼 {lang === 'zh' ? '冲奶喂养计时 (固定1小时)' : 'Feeding Session (Fixed 1-Hour)'}
          </h3>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '1rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '单次限1瓶' : '1 Bottle Max'}
          </span>
        </div>

        {/* State 1: IDLE */}
        {session.status === 'idle' && (
          <div style={{ textAlign: 'center', padding: '1.2rem 0.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
              {lang === 'zh' ? '倒入奶瓶准备喂养后，点击“开始喂养”。系统将开启 1 小时配方奶保质倒计时。' : 'Click "Start Feeding" when formula is poured. Starts fixed 1-hour formula freshness timer.'}
            </div>

            <button
              onClick={handleStartFeeding}
              disabled={isActionLoading}
              className="glass-button"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.9rem',
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ec4899 0%, #6366f1 100%)',
                borderColor: 'rgba(236,72,153,0.5)',
                boxShadow: '0 6px 20px rgba(236,72,153,0.35)',
              }}
            >
              <Play size={20} fill="#fff" />
              <span>{lang === 'zh' ? '开始喂养 (Start Feeding)' : 'Start Feeding Session'}</span>
            </button>
          </div>
        )}

        {/* State 2: ACTIVE */}
        {session.status === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Status Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                <span className="spin" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                <span>{lang === 'zh' ? '喂养进行中' : 'Feeding in Progress'}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lang === 'zh' ? '开始于: ' : 'Started: '} {formatTimeStr(session.startTime)}
              </div>
            </div>

            {/* Countdown Large Clock */}
            <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '2px', color: sessionSecondsRemaining < 600 ? '#f43f5e' : '#fff' }}>
                {formatMmSs(sessionSecondsRemaining)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {lang === 'zh' ? '冲奶1小时保质剩余时间' : 'Formula expiry countdown remaining'}
              </div>
            </div>

            {/* Progress Bar */}
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

            {/* Stop Action Button */}
            <button
              onClick={handleStopFeeding}
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
              <span>{lang === 'zh' ? '停止喂养 (Stop Feeding)' : 'Stop Feeding Session'}</span>
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
                  {session.reason === 'expired'
                    ? (lang === 'zh' ? '冲奶1小时保质已到期' : 'Feeding session timer expired (1 hr)')
                    : (lang === 'zh' ? '喂养已结束' : 'Feeding Session Completed')}
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
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderColor: 'rgba(99,102,241,0.5)',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                }}
              >
                <FileText size={18} />
                <span>{lang === 'zh' ? '填报喂奶记录 (Create Feeding Record)' : 'Create Feeding Record'}</span>
              </button>

              <button
                onClick={handleResetFeeding}
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
                <span>{lang === 'zh' ? '重置 / 开始新喂养' : 'Reset / Start New Session'}</span>
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
              🍾 {lang === 'zh' ? 'Ready-To-Feed 开封保鲜' : 'Ready-To-Feed Opened Expiry'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '冷藏保鲜 (237ml保质48h / 59ml保质24h)' : 'Fridge storage (237ml: 48h / 59ml: 24h)'}
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: activeBottlesCount >= 5 ? '#f43f5e' : 'var(--text-muted)', fontWeight: 600 }}>
            {activeBottlesCount}/5 {lang === 'zh' ? '已开封' : 'Opened'}
          </span>
        </div>

        {/* Bottle Type Selector & Open Button */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.1rem' }}>
          <div style={{ display: 'flex', flex: 1, background: 'rgba(15, 23, 42, 0.6)', borderRadius: '0.75rem', padding: '0.2rem', border: '1px solid var(--card-border)' }}>
            <button
              onClick={() => setSelectedBottleType('237ml')}
              style={{
                flex: 1,
                padding: '0.55rem 0.4rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: selectedBottleType === '237ml' ? 'var(--primary-accent)' : 'transparent',
                color: selectedBottleType === '237ml' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              237ml (48h)
            </button>
            <button
              onClick={() => setSelectedBottleType('59ml')}
              style={{
                flex: 1,
                padding: '0.55rem 0.4rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: selectedBottleType === '59ml' ? 'var(--primary-accent)' : 'transparent',
                color: selectedBottleType === '59ml' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
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
              padding: '0.55rem 1.1rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              background: activeBottlesCount >= 5 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: activeBottlesCount >= 5 ? 'transparent' : 'rgba(16,185,129,0.5)',
              opacity: activeBottlesCount >= 5 ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} />
            <span>{lang === 'zh' ? '开封 (OPEN)' : 'OPEN BOTTLE'}</span>
          </button>
        </div>

        {/* Opened Bottles List */}
        {timersState.openedBottles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '0.85rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Clock size={28} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '0.4rem' }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '暂无开封冷藏的 Ready-To-Feed 瓶装奶水' : 'No open Ready-To-Feed bottles currently being tracked.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {timersState.openedBottles.map((bottle) => {
              const { text, percentLeft, isExpired } = calculateBottleRemaining(bottle.expiresAt, bottle.openedAt);
              return (
                <div
                  key={bottle.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '0.85rem',
                    background: isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(15, 23, 42, 0.7)',
                    border: isExpired ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.5rem',
                          background: bottle.bottleType === '237ml' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(236, 72, 153, 0.25)',
                          color: bottle.bottleType === '237ml' ? '#a5b4fc' : '#f472b6',
                          border: `1px solid ${bottle.bottleType === '237ml' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(236, 72, 153, 0.4)'}`,
                        }}
                      >
                        🍾 {bottle.bottleType}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {lang === 'zh' ? '开封于: ' : 'Opened: '} {formatDateTimeStr(bottle.openedAt)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleFinishBottle(bottle.id)}
                      title={lang === 'zh' ? '喝完或丢弃' : 'Finish or Discard'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Countdown Text & Progress */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {lang === 'zh' ? '到期时间: ' : 'Expires: '} {formatDateTimeStr(bottle.expiresAt)}
                    </span>
                    <span style={{ fontWeight: 700, color: isExpired ? '#ef4444' : percentLeft < 20 ? '#f59e0b' : '#10b981' }}>
                      {text}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percentLeft}%`,
                        background: isExpired ? '#ef4444' : percentLeft < 20 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #3b82f6)',
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
    </div>
  );
}
