import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, FileJson, Calendar, Filter, Check, Clock } from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';

function toDatetimeLocal(d) {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function DataExport({ logs = [], lang, getAuthHeaders }) {
  const isZh = lang === 'zh';

  // Default date range: Past 30 days to now
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return toDatetimeLocal(d);
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return toDatetimeLocal(d);
  });

  const [category, setCategory] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  // Quick Range Presets
  const applyPreset = (preset) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setEndDate(toDatetimeLocal(end));

    if (preset === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      setStartDate(toDatetimeLocal(start));
    } else if (preset === '7days') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      setStartDate(toDatetimeLocal(start));
    } else if (preset === '30days') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      setStartDate(toDatetimeLocal(start));
    } else if (preset === 'all') {
      setStartDate('');
    }
  };

  // Filter logs locally for live count
  const filteredLogs = useMemo(() => {
    const startMs = startDate ? new Date(startDate).getTime() : 0;
    const endMs = endDate ? new Date(endDate).getTime() : Infinity;

    return logs.filter((l) => {
      const logMs = new Date(l.startTime || l.timestamp || l.displayDate).getTime();
      const timeMatch = isNaN(logMs) || (logMs >= startMs && logMs <= endMs);
      const catMatch = category === 'all' || l.category === category;
      return timeMatch && catMatch;
    });
  }, [logs, startDate, endDate, category]);

  // Export CSV download handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (category && category !== 'all') queryParams.append('category', category);
      queryParams.append('format', 'csv');

      const headers = getAuthHeaders ? getAuthHeaders() : {};
      const res = await fetch(`/api/logs/export?${queryParams.toString()}`, { headers });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baby_action_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Local fallback CSV generator
        exportLocalCsv(filteredLogs);
      }
    } catch (err) {
      console.warn('Backend CSV export error, generating client-side fallback:', err);
      exportLocalCsv(filteredLogs);
    } finally {
      setIsExporting(false);
    }
  };

  // Export JSON download handler
  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const jsonStr = JSON.stringify(filteredLogs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baby_action_logs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportLocalCsv = (items) => {
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'ID', 'Date', 'Time', 'Category', 'SubCategory',
      'Amount', 'Duration', 'Start Time', 'End Time',
      'Chinese Description', 'English Description', 'Chinese Notes', 'English Notes', 'Notes', 'Attachments Count'
    ];

    const csvRows = [headers.join(',')];

    for (const log of items) {
      const dDate = log.displayDate || (log.startTime ? new Date(log.startTime).toLocaleDateString() : '');
      const dTime = log.displayTime || (log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
      const row = [
        escapeCsv(log.id),
        escapeCsv(dDate),
        escapeCsv(dTime),
        escapeCsv(log.category || ''),
        escapeCsv(log.subCategory || ''),
        escapeCsv(log.amount || ''),
        escapeCsv(log.duration || ''),
        escapeCsv(log.startTime || log.timestamp || ''),
        escapeCsv(log.endTime || ''),
        escapeCsv(log.originalZh || ''),
        escapeCsv(log.summaryEn || ''),
        escapeCsv(log.notesZh || ''),
        escapeCsv(log.notesEn || ''),
        escapeCsv(log.notes || ''),
        escapeCsv((log.attachments || []).length)
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baby_action_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Analytics & Trends Chart Section */}
      <AnalyticsCharts logs={logs} lang={lang} />

      {/* 2. Export Header Card */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={22} style={{ color: 'var(--primary-accent)' }} />
          {isZh ? '导出宝宝日志数据' : 'Export Baby Logs Data'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {isZh
            ? '选择自定义时间段与类别，导出 Excel/CSV 表格或 JSON 备份数据。'
            : 'Select custom time ranges and categories to download CSV spreadsheet or JSON backup files.'}
        </p>
      </div>

      {/* Filter Options */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Quick Range Presets */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            ⚡ {isZh ? '快捷时间范围 (Quick Presets)' : 'Quick Date Range'}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => applyPreset('today')}
              className="glass-button"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              {isZh ? '今天 Today' : 'Today'}
            </button>
            <button
              onClick={() => applyPreset('7days')}
              className="glass-button"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              {isZh ? '近 7 天 7 Days' : 'Past 7 Days'}
            </button>
            <button
              onClick={() => applyPreset('30days')}
              className="glass-button"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              {isZh ? '近 30 天 30 Days' : 'Past 30 Days'}
            </button>
            <button
              onClick={() => applyPreset('all')}
              className="glass-button"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              {isZh ? '全部历史 All' : 'All Time'}
            </button>
          </div>
        </div>

        {/* Start Time & End Time */}
        <div className="responsive-grid-2col">
          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              📅 {isZh ? '开始时间 (Start Time)' : 'Start Time'}
            </label>
            <input
              type="datetime-local"
              className="input-field compact-datetime"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ width: '100%', minWidth: 0 }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              🏁 {isZh ? '结束时间 (End Time)' : 'End Time'}
            </label>
            <input
              type="datetime-local"
              className="input-field compact-datetime"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Category Selector */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
            🏷️ {isZh ? '筛选类别 (Category Filter)' : 'Category Filter'}
          </label>
          <select
            className="input-field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">✨ {isZh ? '全部类别' : 'All Categories'}</option>
            <option value="feeding">🍼 {isZh ? '喂养' : 'Feeding'}</option>
            <option value="sleep">💤 {isZh ? '睡眠' : 'Sleep'}</option>
            <option value="diaper">🧷 {isZh ? '换尿布' : 'Diaper'}</option>
            <option value="growth">📏 {isZh ? '生长发育' : 'Growth'}</option>
            <option value="health">💊 {isZh ? '健康/用药' : 'Health'}</option>
            <option value="activity">🎈 {isZh ? '日常/游戏' : 'Activity'}</option>
            <option value="other">📝 {isZh ? '其他' : 'Other'}</option>
          </select>
        </div>

        {/* Live Count Preview */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginTop: '0.2rem',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            📊 {isZh ? '符合条件的记录数量:' : 'Matching records count:'}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
            {filteredLogs.length} {isZh ? '条' : 'logs'}
          </span>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        <button
          onClick={handleExportCsv}
          disabled={isExporting || filteredLogs.length === 0}
          className="glass-button"
          style={{
            padding: '0.9rem',
            justify: 'center',
            background: 'var(--primary-accent)',
            borderColor: 'var(--primary-accent)',
            opacity: filteredLogs.length === 0 ? 0.5 : 1
          }}
        >
          <FileSpreadsheet size={18} />
          <span>{isZh ? '导出 CSV (Excel表格)' : 'Export CSV (Excel)'}</span>
        </button>

        <button
          onClick={handleExportJson}
          disabled={isExporting || filteredLogs.length === 0}
          className="glass-button"
          style={{
            padding: '0.9rem',
            justify: 'center',
            opacity: filteredLogs.length === 0 ? 0.5 : 1
          }}
        >
          <FileJson size={18} />
          <span>{isZh ? '导出 JSON 备份' : 'Export JSON Backup'}</span>
        </button>
      </div>
    </div>
  );
}
