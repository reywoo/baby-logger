import React, { useState, useMemo } from 'react';
import { Milk, Moon, Baby, HeartPulse, Activity, FileText, Trash2, Pencil, CloudUpload, Clock, ChevronDown, ChevronRight, Calendar, Image as ImageIcon, X, AlertTriangle } from 'lucide-react';
import { parseDurationToMinutes } from '../utils/timeUtils';

export default function TimelineFeed({ logs, onEditLog, onDeleteLog, lang, t }) {

  const isZh = lang === 'zh';
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [logToDelete, setLogToDelete] = useState(null);

  // Helper to get total sleep minutes from a log item
  const getLogSleepMinutes = (log) => {
    if (log.category !== 'sleep') return 0;
    if (log.startTime && log.endTime) {
      const start = new Date(log.startTime).getTime();
      const end = new Date(log.endTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        return Math.round((end - start) / (1000 * 60));
      }
    }
    if (log.duration) {
      return parseDurationToMinutes(log.duration);
    }
    return 0;
  };

  const formatTotalSleepDisplay = (totalMins, isZhLang) => {
    if (!totalMins || totalMins <= 0) return isZhLang ? '0分' : '0m';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0 && mins > 0) {
      return isZhLang ? `${hrs}小时${mins}分` : `${hrs}h ${mins}m`;
    } else if (hrs > 0) {
      return isZhLang ? `${hrs}小时` : `${hrs}h`;
    } else {
      return isZhLang ? `${mins}分钟` : `${mins}m`;
    }
  };

  // Format date key YYYY-MM-DD from startTime, timestamp or displayDate
  const getLogDateKey = (log) => {
    const rawTime = log.startTime || log.timestamp || log.displayDate;
    if (rawTime) {
      const d = new Date(rawTime);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    return log.displayDate || 'Unknown';
  };

  const todayKey = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // Cutoff date for past 7 days
  const sevenDaysAgoCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // Group logs by date key
  const { dateGroups, sortedKeys, todayLogs } = useMemo(() => {
    const groups = {};
    (logs || []).forEach((log) => {
      let logTime = null;
      if (log.startTime) {
        logTime = new Date(log.startTime).getTime();
      } else if (log.timestamp) {
        logTime = new Date(log.timestamp).getTime();
      } else if (log.displayDate) {
        logTime = new Date(log.displayDate).getTime();
      }

      if (logTime && !isNaN(logTime) && logTime < sevenDaysAgoCutoff) {
        return; // Skip logs older than 7 days
      }

      const key = getLogDateKey(log);
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });

    const keys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));
    const tLogs = groups[todayKey] || [];
    return { dateGroups: groups, sortedKeys: keys, todayLogs: tLogs };
  }, [logs, todayKey, sevenDaysAgoCutoff]);

  const [expandedDates, setExpandedDates] = useState(() => {
    const initial = {};
    if (sortedKeys.length > 0) {
      if (sortedKeys.includes(todayKey)) {
        initial[todayKey] = true;
      } else {
        initial[sortedKeys[0]] = true;
      }
    }
    return initial;
  });

  const toggleDate = (key) => {
    setExpandedDates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Today's summary totals
  const feedingCount = todayLogs.filter((l) => l.category === 'feeding').length;
  const totalMilkMl = todayLogs
    .filter((l) => l.category === 'feeding')
    .reduce((sum, l) => {
      const match = l.amount ? l.amount.match(/(\d+)/) : null;
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0);

  const diaperCount = todayLogs.filter((l) => l.category === 'diaper').length;
  const sleepCount = todayLogs.filter((l) => l.category === 'sleep').length;
  const totalSleepMinutes = todayLogs
    .filter((l) => l.category === 'sleep')
    .reduce((sum, l) => sum + getLogSleepMinutes(l), 0);

  const getBadgeClass = (category) => {
    switch (category) {
      case 'feeding': return 'badge-feeding';
      case 'sleep': return 'badge-sleep';
      case 'diaper': return 'badge-diaper';
      case 'health': return 'badge-health';
      case 'activity': return 'badge-activity';
      default: return 'badge-other';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'feeding': return <Milk size={14} />;
      case 'sleep': return <Moon size={14} />;
      case 'diaper': return <Baby size={14} />;
      case 'health': return <HeartPulse size={14} />;
      case 'activity': return <Activity size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const getDaySummary = (dayLogs) => {
    const fLogs = dayLogs.filter((l) => l.category === 'feeding');
    const milk = fLogs.reduce((sum, l) => {
      const match = l.amount ? l.amount.match(/(\d+)/) : null;
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0);
    const fCount = fLogs.length;

    const sLogs = dayLogs.filter((l) => l.category === 'sleep');
    const sCount = sLogs.length;
    const sMins = sLogs.reduce((sum, l) => sum + getLogSleepMinutes(l), 0);

    const diaper = dayLogs.filter((l) => l.category === 'diaper').length;
    return { milk, fCount, sCount, sMins, diaper };
  };

  const getDateLabel = (key) => {
    if (key === todayKey) return isZh ? '今天 Today' : 'Today';
    if (key === yesterdayKey) return isZh ? '昨天 Yesterday' : 'Yesterday';

    const parts = key.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      if (!isNaN(dateObj.getTime())) {
        const weekdayZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()];
        const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return isZh
          ? `${month + 1}月${day}日 (${weekdayZh})`
          : `${monthNames[month]} ${day} (${weekdayEn})`;
      }
    }
    return key;
  };

  const formatTimeString = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLogTiming = (log) => {
    const startStr = formatTimeString(log.startTime || log.timestamp);
    const endStr = formatTimeString(log.endTime);

    if (startStr && endStr && startStr !== endStr) {
      return `${startStr} - ${endStr}`;
    }
    return startStr || log.displayTime || '';
  };

  const formatRecordTime = (log) => {
    if (!log.recordedAt) return null;
    const recStr = formatTimeString(log.recordedAt);
    if (!recStr) return null;
    return recStr;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Today's Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
        {/* Feeding Card */}
        <div className="glass-panel" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--feeding-color)', marginBottom: '0.25rem' }}>
            <Milk size={20} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {totalMilkMl} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ml</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 700, marginTop: '0.15rem' }}>
            {feedingCount} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{isZh ? '次' : (feedingCount === 1 ? 'feed' : 'feeds')}</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.totalMilk}</div>
        </div>

        {/* Sleep Card */}
        <div className="glass-panel" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--sleep-color)', marginBottom: '0.25rem' }}>
            <Moon size={20} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {formatTotalSleepDisplay(totalSleepMinutes, isZh)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700, marginTop: '0.15rem' }}>
            {sleepCount} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{isZh ? '次' : (sleepCount === 1 ? 'time' : 'times')}</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.totalSleep}</div>
        </div>

        {/* Diaper Card */}
        <div className="glass-panel" style={{ padding: '0.75rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--diaper-color)', marginBottom: '0.25rem' }}>
            <Baby size={20} style={{ margin: '0 auto' }} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {diaperCount} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{isZh ? '次' : (diaperCount === 1 ? 'time' : 'times')}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#22d3ee', fontWeight: 700, marginTop: '0.15rem' }}>
            {isZh ? '尿布更换' : 'changes'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.totalDiaper}</div>
        </div>
      </div>

      {/* Date Accordion List */}
      {sortedKeys.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
          <Calendar size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
          <div style={{ fontSize: '0.95rem' }}>{t.noLogsYet}</div>
        </div>
      ) : (
        sortedKeys.map((dateKey) => {
          const dayLogs = dateGroups[dateKey];
          const isExpanded = !!expandedDates[dateKey];
          const summary = getDaySummary(dayLogs);
          const isToday = dateKey === todayKey;

          return (
            <div key={dateKey} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Accordion Header */}
              <button
                onClick={() => toggleDate(dateKey)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  background: isToday ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: isExpanded ? '1px solid var(--card-border)' : 'none',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Calendar size={18} style={{ color: isToday ? 'var(--primary-accent)' : 'var(--text-muted)' }} />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {getDateLabel(dateKey)}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    background: 'rgba(255,255,255,0.08)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '1rem',
                    color: 'var(--text-muted)'
                  }}>
                    {dayLogs.length} {isZh ? '条记录' : 'logs'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Daily Mini Summary Badges */}
                  <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem' }}>
                    {summary.milk > 0 && (
                      <span style={{ color: 'var(--feeding-color)', fontWeight: 600, background: 'rgba(236,72,153,0.1)', padding: '0.15rem 0.4rem', borderRadius: '0.5rem' }}>
                        🥛 {summary.milk}ml ({summary.fCount}{isZh ? '次' : 'x'})
                      </span>
                    )}
                    {(summary.sMins > 0 || summary.sCount > 0) && (
                      <span style={{ color: 'var(--sleep-color)', fontWeight: 600, background: 'rgba(139,92,246,0.1)', padding: '0.15rem 0.4rem', borderRadius: '0.5rem' }}>
                        😴 {formatTotalSleepDisplay(summary.sMins, isZh)} ({summary.sCount}{isZh ? '次' : 'x'})
                      </span>
                    )}
                    {summary.diaper > 0 && (
                      <span style={{ color: 'var(--diaper-color)', fontWeight: 600, background: 'rgba(6,182,212,0.1)', padding: '0.15rem 0.4rem', borderRadius: '0.5rem' }}>
                        👶 {summary.diaper}{isZh ? '次' : 'x'}
                      </span>
                    )}
                  </div>

                  {isExpanded ? <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </button>

              {/* Accordion Body */}
              {isExpanded && (
                <div style={{ padding: '1.25rem 1.25rem 0.5rem 1.25rem' }}>
                  {dayLogs.map((log) => {
                    const timingDisplay = formatLogTiming(log);
                    const recTimeDisplay = formatRecordTime(log);
                    const attachments = log.attachments || [];

                    return (
                      <div key={log.id} className="timeline-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span className={`badge ${getBadgeClass(log.category)}`}>
                              {getCategoryIcon(log.category)}
                              {log.category}
                            </span>
                            
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              ⏱️ {timingDisplay}
                            </span>

                            {recTimeDisplay && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                ({isZh ? '记录于' : 'rec at'} {recTimeDisplay})
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {log.syncedToSheet && (
                              <span title="Synced to Google Sheet" style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center' }}>
                                <CloudUpload size={14} />
                              </span>
                            )}
                            <button
                              onClick={() => onEditLog && onEditLog(log)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#a5b4fc',
                                cursor: 'pointer',
                                padding: '0.25rem 0.4rem',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                transition: 'all 0.2s ease',
                              }}
                              title={isZh ? '编辑记录' : 'Edit entry'}
                            >
                              <Pencil size={13} />
                              <span>{isZh ? '编辑' : 'Edit'}</span>
                            </button>

                            <button
                              onClick={() => setLogToDelete(log)}
                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7 }}
                              title={isZh ? '删除记录' : 'Delete entry'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                        </div>

                        <div style={{ marginTop: '0.4rem', fontSize: '0.95rem', fontWeight: 600 }}>
                          {log.originalZh || log.summaryEn}
                        </div>

                        {log.originalZh && log.summaryEn && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {log.summaryEn}
                          </div>
                        )}

                        {(log.amount || log.duration) && (
                          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                            {log.amount && <span style={{ color: 'var(--feeding-color)', fontWeight: 600 }}>🥛 {log.amount}</span>}
                            {log.duration && <span style={{ color: 'var(--sleep-color)', fontWeight: 600 }}>⏱️ {log.duration}</span>}
                          </div>
                        )}

                        {/* Photo Attachments Gallery */}
                        {attachments.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                            {attachments.map((att) => (
                              <div
                                key={att.id || att.fileName}
                                onClick={() => setSelectedPhoto(att.url)}
                                style={{
                                  position: 'relative',
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border: '1px solid var(--card-border)',
                                  flexShrink: 0,
                                }}
                              >
                                <img
                                  src={att.url}
                                  alt={att.fileName}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Delete Confirmation Modal Overlay */}
      {logToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="glass-panel modal-content" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '1.75rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#f87171' }}>
              <AlertTriangle size={44} />
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f87171' }}>
              {isZh ? '确认删除此记录？' : 'Confirm Delete Log?'}
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {logToDelete.originalZh || logToDelete.summaryEn || (isZh ? '记录删除后将无法恢复。' : 'This entry will be permanently removed.')}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                className="glass-button"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <X size={16} />
                <span>{isZh ? '取消' : 'Cancel'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteLog(logToDelete.id);
                  setLogToDelete(null);
                }}
                className="glass-button"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 600
                }}
              >
                <Trash2 size={16} />
                <span>{isZh ? '确认删除' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal */}
      {selectedPhoto && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPhoto(null)}
          style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000 }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: -35,
                right: 0,
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <X size={28} />
            </button>
            <img
              src={selectedPhoto}
              alt="Enlarged preview"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
