import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, Info } from 'lucide-react';

export default function AnalyticsCharts({ logs = [], lang = 'zh' }) {
  const isZh = lang === 'zh';
  const [metric, setMetric] = useState('formula_volume'); // 'formula_volume' | 'sleep_time' | 'weight' | 'height'
  const [daysCount, setDaysCount] = useState(7); // 7 | 14
  const [activeTooltip, setActiveTooltip] = useState(null);

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
    // Oz conversion if applicable
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
    const endDateObj = new Date();
    endDateObj.setHours(23, 59, 59, 999);

    // Build date array for past 7 or 14 days
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
            const vol = parseAmountNumber(log.amount);
            dailyMap[logDateKey] += vol;
          }
        }
      });

      const items = dateKeys.map((k) => ({
        dateKey: k,
        label: formatShortDate(k),
        value: dailyMap[k],
        unit: 'ml',
      }));

      const totalVal = items.reduce((acc, curr) => acc + curr.value, 0);
      const avgVal = Math.round(totalVal / daysCount);
      const maxVal = Math.max(...items.map((i) => i.value), 100);

      return {
        type: 'bar',
        items,
        avgVal,
        maxVal,
        totalVal,
        titleZh: '每日配方奶总喂养量',
        titleEn: 'Daily Formula Feeding Volume',
        unit: 'ml',
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
            const mins = parseDurationMinutes(log);
            dailyMap[logDateKey] += mins;
          }
        }
      });

      const items = dateKeys.map((k) => ({
        dateKey: k,
        label: formatShortDate(k),
        value: parseFloat((dailyMap[k] / 60).toFixed(1)),
        unit: 'hrs',
      }));

      const totalVal = items.reduce((acc, curr) => acc + curr.value, 0);
      const avgVal = parseFloat((totalVal / daysCount).toFixed(1));
      const maxVal = Math.max(...items.map((i) => i.value), 10);

      return {
        type: 'bar',
        items,
        avgVal,
        maxVal,
        totalVal: parseFloat(totalVal.toFixed(1)),
        titleZh: '每日睡眠总时长',
        titleEn: 'Daily Total Sleep Duration',
        unit: 'hrs',
        avgLabelZh: `近${daysCount}天日均: ${avgVal} 小时`,
        avgLabelEn: `${daysCount}-Day Daily Avg: ${avgVal} hrs`,
      };
    } else if (metric === 'weight') {
      const points = [];
      logs.forEach((log) => {
        if (log.category === 'growth' && log.subCategory === 'weight') {
          const dObj = new Date(log.startTime || log.timestamp || log.displayDate);
          const dateKey = formatDateKey(dObj);
          if (dateKeys.includes(dateKey)) {
            const val = parseAmountNumber(log.amount);
            if (val > 0) {
              points.push({
                dateKey,
                label: formatShortDate(dateKey),
                value: val,
                unit: 'kg',
                timestamp: dObj.getTime(),
              });
            }
          }
        }
      });

      points.sort((a, b) => a.timestamp - b.timestamp);

      // If no points, generate empty timeframe structure
      const items = dateKeys.map((k) => {
        const found = points.find((p) => p.dateKey === k);
        return {
          dateKey: k,
          label: formatShortDate(k),
          value: found ? found.value : null,
          unit: 'kg',
        };
      });

      const recordedValues = points.map((p) => p.value);
      const latestVal = recordedValues.length > 0 ? recordedValues[recordedValues.length - 1] : null;
      const minVal = recordedValues.length > 0 ? Math.min(...recordedValues) * 0.95 : 3.0;
      const maxVal = recordedValues.length > 0 ? Math.max(...recordedValues) * 1.05 : 10.0;

      return {
        type: 'dot',
        items,
        recordedPoints: points,
        latestVal,
        minVal,
        maxVal,
        titleZh: '体重记录变化趋势',
        titleEn: 'Weight Measurement Trend',
        unit: 'kg',
        avgLabelZh: latestVal ? `最新体重: ${latestVal} kg` : '暂无数据',
        avgLabelEn: latestVal ? `Latest Weight: ${latestVal} kg` : 'No Data',
      };
    } else if (metric === 'height') {
      const points = [];
      logs.forEach((log) => {
        if (log.category === 'growth' && log.subCategory === 'height') {
          const dObj = new Date(log.startTime || log.timestamp || log.displayDate);
          const dateKey = formatDateKey(dObj);
          if (dateKeys.includes(dateKey)) {
            const val = parseAmountNumber(log.amount);
            if (val > 0) {
              points.push({
                dateKey,
                label: formatShortDate(dateKey),
                value: val,
                unit: 'cm',
                timestamp: dObj.getTime(),
              });
            }
          }
        }
      });

      points.sort((a, b) => a.timestamp - b.timestamp);

      const items = dateKeys.map((k) => {
        const found = points.find((p) => p.dateKey === k);
        return {
          dateKey: k,
          label: formatShortDate(k),
          value: found ? found.value : null,
          unit: 'cm',
        };
      });

      const recordedValues = points.map((p) => p.value);
      const latestVal = recordedValues.length > 0 ? recordedValues[recordedValues.length - 1] : null;
      const minVal = recordedValues.length > 0 ? Math.min(...recordedValues) * 0.95 : 50.0;
      const maxVal = recordedValues.length > 0 ? Math.max(...recordedValues) * 1.05 : 90.0;

      return {
        type: 'dot',
        items,
        recordedPoints: points,
        latestVal,
        minVal,
        maxVal,
        titleZh: '身高记录变化趋势',
        titleEn: 'Height Measurement Trend',
        unit: 'cm',
        avgLabelZh: latestVal ? `最新身高: ${latestVal} cm` : '暂无数据',
        avgLabelEn: latestVal ? `Latest Height: ${latestVal} cm` : 'No Data',
      };
    }
  }, [logs, metric, daysCount]);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
      {/* Title & Metric Dropdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
            <TrendingUp size={20} style={{ color: 'var(--primary-accent)' }} />
            <span>{isZh ? '宝宝数据分析与趋势图' : 'Baby Analytics & Trends'}</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isZh ? '查看喂养量、睡眠时长及生长发育图表' : 'Visualize daily feeding, sleep duration, & growth trends'}
          </p>
        </div>

        {/* Timeframe Selector Pill [7 Days | 14 Days] */}
        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', borderRadius: '0.75rem', padding: '0.2rem', border: '1px solid var(--card-border)' }}>
          <button
            type="button"
            onClick={() => setDaysCount(7)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.55rem',
              border: daysCount === 7 ? '1px solid var(--primary-accent)' : '1px solid transparent',
              background: daysCount === 7 ? 'var(--primary-accent)' : 'transparent',
              color: daysCount === 7 ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isZh ? '近7天 (7 Days)' : '7 Days'}
          </button>
          <button
            type="button"
            onClick={() => setDaysCount(14)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.55rem',
              border: daysCount === 14 ? '1px solid var(--primary-accent)' : '1px solid transparent',
              background: daysCount === 14 ? 'var(--primary-accent)' : 'transparent',
              color: daysCount === 14 ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isZh ? '近14天 (14 Days)' : '14 Days'}
          </button>
        </div>
      </div>

      {/* Metric Selector Dropdown */}
      <div style={{ marginBottom: '1.25rem' }}>
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
        padding: '0.65rem 0.9rem',
        borderRadius: '0.75rem',
        background: 'rgba(99, 102, 241, 0.12)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
          {isZh ? chartData.titleZh : chartData.titleEn}
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
          {chartData.avgLabelZh}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div style={{ position: 'relative', width: '100%', height: '220px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '1rem', padding: '1rem 0.5rem 0.5rem 0.5rem', border: '1px solid var(--card-border)' }}>
        {/* BAR CHART RENDERER (Formula Volume & Sleep Time) */}
        {chartData.type === 'bar' && (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
            {/* Horizontal Average Reference Line */}
            {chartData.avgVal > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${Math.min(90, Math.max(10, (chartData.avgVal / chartData.maxVal) * 100 * 0.75 + 15))}%`,
                  borderTop: '2px dashed #f472b6',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              >
                <span style={{ position: 'absolute', right: '8px', top: '-18px', fontSize: '0.65rem', color: '#f472b6', background: 'rgba(15, 23, 42, 0.8)', padding: '0 4px', borderRadius: '4px', fontWeight: 700 }}>
                  {isZh ? `均值: ${chartData.avgVal}${chartData.unit}` : `Avg: ${chartData.avgVal}${chartData.unit}`}
                </span>
              </div>
            )}

            {/* Bars Container */}
            <div style={{ display: 'flex', width: '100%', height: '75%', alignItems: 'flex-end', gap: daysCount === 14 ? '2px' : '6px', zIndex: 3 }}>
              {chartData.items.map((item, idx) => {
                const heightPercent = chartData.maxVal > 0 ? (item.value / chartData.maxVal) * 100 : 0;
                const isHovered = activeTooltip === idx;

                return (
                  <div
                    key={item.dateKey}
                    onMouseEnter={() => setActiveTooltip(idx)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === idx ? null : idx)}
                    style={{
                      flex: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Tooltip Popup */}
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '105%',
                          background: 'rgba(30, 41, 59, 0.95)',
                          border: '1px solid var(--primary-accent)',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          pointerEvents: 'none',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{item.dateKey}</div>
                        <div style={{ fontWeight: 800, color: 'var(--primary-accent)' }}>
                          {item.value} {item.unit}
                        </div>
                      </div>
                    )}

                    {/* Bar graphic */}
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(4, heightPercent)}%`,
                        background: item.value > 0
                          ? (metric === 'formula_volume'
                              ? 'linear-gradient(180deg, #ec4899 0%, #8b5cf6 100%)'
                              : 'linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%)')
                          : 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '4px 4px 2px 2px',
                        transition: 'height 0.3s ease',
                        boxShadow: item.value > 0 ? '0 0 8px rgba(139, 92, 246, 0.3)' : 'none',
                        opacity: item.value > 0 ? 1 : 0.4,
                      }}
                    />

                    {/* X-axis Label */}
                    <div
                      style={{
                        fontSize: daysCount === 14 ? '0.6rem' : '0.68rem',
                        color: 'var(--text-muted)',
                        marginTop: '6px',
                        fontWeight: 600,
                        transform: daysCount === 14 ? 'rotate(-30deg)' : 'none',
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DOT / SCATTER LINE CHART RENDERER (Weight & Height) */}
        {chartData.type === 'dot' && (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {chartData.recordedPoints.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Info size={24} style={{ marginBottom: '0.4rem', opacity: 0.6 }} />
                <span>{isZh ? `近 ${daysCount} 天暂无${metric === 'weight' ? '体重' : '身高'}记录` : `No ${metric} recorded in past ${daysCount} days`}</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: '75%', display: 'flex', alignItems: 'flex-end', gap: daysCount === 14 ? '2px' : '6px', position: 'relative', zIndex: 3 }}>
                {chartData.items.map((item, idx) => {
                  const hasValue = item.value !== null && item.value !== undefined;
                  const range = chartData.maxVal - chartData.minVal || 1;
                  const dotHeightPercent = hasValue
                    ? Math.min(90, Math.max(10, ((item.value - chartData.minVal) / range) * 100))
                    : 0;

                  const isHovered = activeTooltip === idx;

                  return (
                    <div
                      key={item.dateKey}
                      onMouseEnter={() => hasValue && setActiveTooltip(idx)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onClick={() => hasValue && setActiveTooltip(activeTooltip === idx ? null : idx)}
                      style={{
                        flex: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        position: 'relative',
                        cursor: hasValue ? 'pointer' : 'default',
                      }}
                    >
                      {/* Tooltip Popup */}
                      {isHovered && hasValue && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: `${dotHeightPercent + 15}%`,
                            background: 'rgba(30, 41, 59, 0.95)',
                            border: '1px solid #10b981',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                            pointerEvents: 'none',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{item.dateKey}</div>
                          <div style={{ fontWeight: 800, color: '#34d399' }}>
                            {item.value} {item.unit}
                          </div>
                        </div>
                      )}

                      {/* Dot & Label */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: `${dotHeightPercent}%`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        {hasValue ? (
                          <>
                            <div
                              style={{
                                fontSize: '0.62rem',
                                color: '#34d399',
                                fontWeight: 800,
                                marginBottom: '2px',
                                background: 'rgba(16,185,129,0.15)',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                border: '1px solid rgba(16,185,129,0.3)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.value}
                            </div>
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                                border: '2px solid #fff',
                                boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                              }}
                            />
                          </>
                        ) : (
                          <div
                            style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.15)',
                            }}
                          />
                        )}
                      </div>

                      {/* X-axis Label */}
                      <div
                        style={{
                          fontSize: daysCount === 14 ? '0.6rem' : '0.68rem',
                          color: hasValue ? '#fff' : 'var(--text-muted)',
                          fontWeight: hasValue ? 700 : 500,
                          marginTop: '6px',
                          transform: daysCount === 14 ? 'rotate(-30deg)' : 'none',
                        }}
                      >
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
