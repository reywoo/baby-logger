import React, { useState, useMemo } from 'react';
import { TrendingUp, Info } from 'lucide-react';

export default function AnalyticsCharts({ logs = [], lang = 'zh' }) {
  const isZh = lang === 'zh';
  const [metric, setMetric] = useState('formula_volume'); // 'formula_volume' | 'sleep_time' | 'weight' | 'height'
  const [daysCount, setDaysCount] = useState(7); // 7 | 14 | 30

  // Helper to format Date to YYYY-MM-DD
  const formatDateKey = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatShortDate = (dateKey) => {
    const parts = dateKey.split('-');
    if (parts.length < 3) return dateKey;
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
  };

  // Helper to extract numbers from amount string
  const parseAmountNumber = (amountStr) => {
    if (!amountStr) return 0;
    const str = String(amountStr).toLowerCase();
    const ozMatch = str.match(/([\d.]+)\s*oz/);
    if (ozMatch) {
      return Math.round(parseFloat(ozMatch[1]) * 29.5735);
    }
    const match = str.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Helper to extract duration in minutes
  const parseDurationMinutes = (log) => {
    if (log.duration) {
      const str = String(log.duration).toLowerCase();
      const hrMatch = str.match(/([\d.]+)\s*(hr|hour|小时)/);
      const minMatch = str.match(/([\d.]+)\s*(min|分)/);
      let mins = 0;
      if (hrMatch) mins += parseFloat(hrMatch[1]) * 60;
      if (minMatch) mins += parseFloat(minMatch[1]);
      if (mins > 0) return mins;
    }
    if (log.startTime && log.endTime) {
      const s = new Date(log.startTime).getTime();
      const e = new Date(log.endTime).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        return (e - s) / (1000 * 60);
      }
    }
    return 0;
  };

  // Process data based on metric and timeframe
  const chartData = useMemo(() => {
    // Build date array for past 7, 14, or 30 days
    const dateKeys = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateKeys.push(formatDateKey(d));
    }

    if (metric === 'formula_volume') {
      const dailyMap = {};
      dateKeys.forEach((k) => (dailyMap[k] = 0));

      logs.forEach((log) => {
        if (log.category === 'feeding') {
          const logDateKey = formatDateKey(new Date(log.startTime || log.timestamp || log.displayDate));
          if (dailyMap.hasOwnProperty(logDateKey)) {
            dailyMap[logDateKey] += parseAmountNumber(log.amount);
          }
        }
      });

      const items = dateKeys.map((k) => ({
        dateKey: k,
        label: formatShortDate(k),
        value: dailyMap[k],
        hasValue: dailyMap[k] > 0,
        unit: 'ml',
      }));

      const totalVal = items.reduce((acc, curr) => acc + curr.value, 0);
      const avgVal = Math.round(totalVal / daysCount);
      const rawMax = Math.max(...items.map((i) => i.value));
      const maxY = Math.max(300, Math.ceil((rawMax * 1.15) / 50) * 50);
      const minY = 0;

      return {
        metric,
        items,
        avgVal,
        minY,
        maxY,
        unit: 'ml',
        titleZh: '每日配方奶总喂养量',
        titleEn: 'Daily Formula Feeding Volume',
        avgLabelZh: `近${daysCount}天日均: ${avgVal} ml`,
        avgLabelEn: `${daysCount}-Day Daily Avg: ${avgVal} ml`,
      };
    } else if (metric === 'sleep_time') {
      const dailyMap = {};
      dateKeys.forEach((k) => (dailyMap[k] = 0));

      logs.forEach((log) => {
        if (log.category === 'sleep') {
          const logDateKey = formatDateKey(new Date(log.startTime || log.timestamp || log.displayDate));
          if (dailyMap.hasOwnProperty(logDateKey)) {
            dailyMap[logDateKey] += parseDurationMinutes(log);
          }
        }
      });

      const items = dateKeys.map((k) => {
        const hrs = parseFloat((dailyMap[k] / 60).toFixed(1));
        return {
          dateKey: k,
          label: formatShortDate(k),
          value: hrs,
          hasValue: hrs > 0,
          unit: 'h',
        };
      });

      const totalVal = items.reduce((acc, curr) => acc + curr.value, 0);
      const avgVal = parseFloat((totalVal / daysCount).toFixed(1));
      const rawMax = Math.max(...items.map((i) => i.value));
      const maxY = Math.max(12, Math.ceil(rawMax * 1.15));
      const minY = 0;

      return {
        metric,
        items,
        avgVal,
        minY,
        maxY,
        unit: 'h',
        titleZh: '每日睡眠总时长',
        titleEn: 'Daily Total Sleep Duration',
        avgLabelZh: `近${daysCount}天日均: ${avgVal} 小时`,
        avgLabelEn: `${daysCount}-Day Daily Avg: ${avgVal} hrs`,
      };
    } else if (metric === 'weight') {
      const pointsMap = {};
      logs.forEach((log) => {
        if (log.category === 'growth' && log.subCategory === 'weight') {
          const logDateKey = formatDateKey(new Date(log.startTime || log.timestamp || log.displayDate));
          if (dateKeys.includes(logDateKey)) {
            const val = parseAmountNumber(log.amount);
            if (val > 0) pointsMap[logDateKey] = val;
          }
        }
      });

      const items = dateKeys.map((k) => ({
        dateKey: k,
        label: formatShortDate(k),
        value: pointsMap.hasOwnProperty(k) ? pointsMap[k] : null,
        hasValue: pointsMap.hasOwnProperty(k),
        unit: 'kg',
      }));

      const recordedVals = Object.values(pointsMap);
      const latestVal = recordedVals.length > 0 ? recordedVals[recordedVals.length - 1] : null;
      const rawMin = recordedVals.length > 0 ? Math.min(...recordedVals) : 3.0;
      const rawMax = recordedVals.length > 0 ? Math.max(...recordedVals) : 8.0;

      const minY = Math.max(0, Math.floor((rawMin - 0.5) * 2) / 2);
      const maxY = Math.ceil((rawMax + 0.5) * 2) / 2 || minY + 2;

      return {
        metric,
        items,
        latestVal,
        minY,
        maxY,
        unit: 'kg',
        titleZh: '体重记录变化趋势',
        titleEn: 'Weight Measurement Trend',
        avgLabelZh: latestVal ? `最新体重: ${latestVal} kg` : '暂无记录',
        avgLabelEn: latestVal ? `Latest Weight: ${latestVal} kg` : 'No Record',
      };
    } else if (metric === 'height') {
      const pointsMap = {};
      logs.forEach((log) => {
        if (log.category === 'growth' && log.subCategory === 'height') {
          const logDateKey = formatDateKey(new Date(log.startTime || log.timestamp || log.displayDate));
          if (dateKeys.includes(logDateKey)) {
            const val = parseAmountNumber(log.amount);
            if (val > 0) pointsMap[logDateKey] = val;
          }
        }
      });

      const items = dateKeys.map((k) => ({
        dateKey: k,
        label: formatShortDate(k),
        value: pointsMap.hasOwnProperty(k) ? pointsMap[k] : null,
        hasValue: pointsMap.hasOwnProperty(k),
        unit: 'cm',
      }));

      const recordedVals = Object.values(pointsMap);
      const latestVal = recordedVals.length > 0 ? recordedVals[recordedVals.length - 1] : null;
      const rawMin = recordedVals.length > 0 ? Math.min(...recordedVals) : 50.0;
      const rawMax = recordedVals.length > 0 ? Math.max(...recordedVals) : 80.0;

      const minY = Math.max(0, Math.floor((rawMin - 2) / 5) * 5);
      const maxY = Math.ceil((rawMax + 2) / 5) * 5 || minY + 10;

      return {
        metric,
        items,
        latestVal,
        minY,
        maxY,
        unit: 'cm',
        titleZh: '身高记录变化趋势',
        titleEn: 'Height Measurement Trend',
        avgLabelZh: latestVal ? `最新身高: ${latestVal} cm` : '暂无记录',
        avgLabelEn: latestVal ? `Latest Height: ${latestVal} cm` : 'No Record',
      };
    }
  }, [logs, metric, daysCount]);

  // Generate 4 Y-Axis Ticks
  const yTicks = useMemo(() => {
    const minY = chartData.minY;
    const maxY = chartData.maxY;
    const range = maxY - minY || 1;
    const step = range / 3;

    return [
      { val: parseFloat(maxY.toFixed(1)), percent: 100 },
      { val: parseFloat((minY + step * 2).toFixed(1)), percent: 66.6 },
      { val: parseFloat((minY + step * 1).toFixed(1)), percent: 33.3 },
      { val: parseFloat(minY.toFixed(1)), percent: 0 },
    ];
  }, [chartData.minY, chartData.maxY]);

  // Calculate coordinates for valid data points in Scatter/Line plot
  const activePoints = useMemo(() => {
    const { items, minY, maxY } = chartData;
    const range = maxY - minY || 1;
    const count = items.length;

    return items.map((item, idx) => {
      // Horizontal X percent (from 0% to 100%)
      const xPct = count > 1 ? (idx / (count - 1)) * 100 : 50;
      // Vertical Y percent from bottom (0% to 100%)
      const yPct = item.hasValue ? Math.min(100, Math.max(0, ((item.value - minY) / range) * 100)) : null;

      return {
        ...item,
        xPct,
        yPct,
        idx,
      };
    });
  }, [chartData]);

  // Valid points connected by polylines
  const validPoints = useMemo(() => {
    return activePoints.filter((p) => p.hasValue);
  }, [activePoints]);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
      {/* Title & Timeframe Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
            <TrendingUp size={20} style={{ color: 'var(--primary-accent)' }} />
            <span>{isZh ? '宝宝数据分析与趋势图' : 'Baby Analytics & Trends'}</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isZh ? '直观追踪每日奶量、睡眠时长及生长发育趋势' : 'Visualize daily feeding, sleep, weight, & height trends'}
          </p>
        </div>

        {/* Timeframe Selector Pill [ 7 Days | 14 Days | 30 Days ] */}
        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', borderRadius: '0.75rem', padding: '0.2rem', border: '1px solid var(--card-border)' }}>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysCount(d)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '0.55rem',
                border: daysCount === d ? '1px solid var(--primary-accent)' : '1px solid transparent',
                background: daysCount === d ? 'var(--primary-accent)' : 'transparent',
                color: daysCount === d ? '#fff' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isZh ? `${d}天` : `${d}D`}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Selector Dropdown */}
      <div style={{ marginBottom: '1.1rem' }}>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          📊 {isZh ? '选择图表指标 (Select Chart Metric)' : 'Select Metric'}
        </label>
        <select
          className="input-field"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          style={{ width: '100%', fontSize: '0.92rem', padding: '0.65rem 0.85rem' }}
        >
          <option value="formula_volume">🍼 {isZh ? '配方奶喂养量 (Formula Volume - ml)' : 'Formula Feeding Volume (ml)'}</option>
          <option value="sleep_time">💤 {isZh ? '睡眠总时长 (Sleep Duration - hrs)' : 'Total Sleep Duration (hrs)'}</option>
          <option value="weight">⚖️ {isZh ? '体重变化趋势 (Weight - kg)' : 'Weight Trend (kg)'}</option>
          <option value="height">📏 {isZh ? '身高变化趋势 (Height - cm)' : 'Height Trend (cm)'}</option>
        </select>
      </div>

      {/* Stat Badge Banner */}
      <div style={{
        padding: '0.6rem 0.9rem',
        borderRadius: '0.75rem',
        background: 'rgba(99, 102, 241, 0.12)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
          {isZh ? chartData.titleZh : chartData.titleEn}
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
          {isZh ? chartData.avgLabelZh : chartData.avgLabelEn}
        </div>
      </div>

      {/* Scatter / Line Chart Main Diagram Box */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          background: 'rgba(15, 23, 42, 0.55)',
          borderRadius: '1rem',
          padding: '1.25rem 0.6rem 1.8rem 3.5rem',
          border: '1px solid var(--card-border)',
          overflow: 'hidden',
        }}
      >
        {/* 1. Y-AXIS TICKS & HORIZONTAL GRIDLINES */}
        <div style={{ position: 'absolute', left: 0, top: '1.25rem', bottom: '1.8rem', width: '3.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '0.4rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          {yTicks.map((tick, i) => (
            <span key={i} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
              {tick.val}
            </span>
          ))}
        </div>

        {/* Horizontal Grid Lines Container */}
        <div style={{ position: 'absolute', left: '3.3rem', right: '0.6rem', top: '1.25rem', bottom: '1.8rem', pointerEvents: 'none' }}>
          {yTicks.map((tick, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${100 - tick.percent}%`,
                borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
              }}
            />
          ))}

          {/* Average Line for Feeding & Sleep */}
          {(metric === 'formula_volume' || metric === 'sleep_time') && chartData.avgVal > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${Math.min(96, Math.max(4, 100 - ((chartData.avgVal - chartData.minY) / (chartData.maxY - chartData.minY || 1)) * 100))}%`,
                borderTop: '2px dashed #f472b6',
                zIndex: 2,
              }}
            >
              <span style={{ position: 'absolute', right: '4px', top: '-16px', fontSize: '0.62rem', color: '#f472b6', background: 'rgba(15, 23, 42, 0.85)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                {isZh ? `均值: ${chartData.avgVal}${chartData.unit}` : `Avg: ${chartData.avgVal}${chartData.unit}`}
              </span>
            </div>
          )}
        </div>

        {/* 2. SVG CONNECTING LINE */}
        {validPoints.length >= 2 && (
          <svg
            style={{ position: 'absolute', left: '3.3rem', right: '0.6rem', top: '1.25rem', bottom: '1.8rem', width: 'calc(100% - 3.9rem)', height: 'calc(100% - 3.05rem)', pointerEvents: 'none', zIndex: 3 }}
          >
            <polyline
              fill="none"
              stroke={metric === 'weight' || metric === 'height' ? '#34d399' : '#8b5cf6'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={validPoints.map((p) => `${p.xPct}%,${100 - p.yPct}%`).join(' ')}
              style={{ filter: 'drop-shadow(0px 2px 6px rgba(139, 92, 246, 0.5))' }}
            />
          </svg>
        )}

        {/* 3. SCATTER DATA POINTS & DIRECT VALUE LABELS */}
        <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 4 }}>
          {activePoints.map((pt) => {
            // Label visibility rules for 30-day mode to prevent label crowding
            const showXLabel = daysCount <= 14 || pt.idx % 3 === 0 || pt.idx === activePoints.length - 1;

            return (
              <div
                key={pt.dateKey}
                style={{
                  position: 'absolute',
                  left: `${pt.xPct}%`,
                  top: 0,
                  bottom: 0,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Data Point Marker & Direct Value Display */}
                {pt.hasValue ? (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: `${pt.yPct}%`,
                      transform: 'translateY(50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {/* Direct Value Tag (NO Hover Required!) */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '14px',
                        fontSize: daysCount === 30 ? '0.58rem' : '0.66rem',
                        fontWeight: 800,
                        color: metric === 'weight' || metric === 'height' ? '#34d399' : '#a78bfa',
                        background: 'rgba(15, 23, 42, 0.9)',
                        padding: '1px 3px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        pointerEvents: 'none',
                      }}
                    >
                      {pt.value}{pt.unit}
                    </div>

                    {/* Glowing Scatter Dot */}
                    <div
                      style={{
                        width: daysCount === 30 ? '8px' : '10px',
                        height: daysCount === 30 ? '8px' : '10px',
                        borderRadius: '50%',
                        background: metric === 'weight' || metric === 'height'
                          ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                          : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                        border: '2px solid #fff',
                        boxShadow: '0 0 8px rgba(236, 72, 153, 0.8)',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0%',
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.12)',
                    }}
                  />
                )}

                {/* X-Axis Date Label */}
                {showXLabel && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-1.4rem',
                      fontSize: daysCount === 30 ? '0.58rem' : '0.66rem',
                      color: pt.hasValue ? '#fff' : 'var(--text-muted)',
                      fontWeight: pt.hasValue ? 700 : 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pt.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
