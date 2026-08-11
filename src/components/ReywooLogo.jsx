import React from 'react';

export default function ReywooLogo({ size = 36, showText = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', userSelect: 'none', flexShrink: 0 }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 0 12px rgba(6, 182, 212, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 200 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', filter: 'drop-shadow(0px 2px 6px rgba(56, 189, 248, 0.6))' }}
        >
          <defs>
            <linearGradient id="cloudBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>

          {/* Cloud Outline */}
          <path
            d="M 45 115 
               A 24 24 0 0 1 30 68 
               A 34 34 0 0 1 92 42 
               A 30 30 0 0 1 148 58 
               A 24 24 0 0 1 168 115 Z"
            stroke="url(#cloudBorder)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Brain Network Left Node Cluster */}
          <line x1="68" y1="82" x2="84" y2="72" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />
          <line x1="84" y1="72" x2="98" y2="82" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />
          <line x1="68" y1="82" x2="76" y2="94" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />
          <line x1="76" y1="94" x2="94" y2="92" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />
          <line x1="94" y1="92" x2="98" y2="82" stroke="#38bdf8" strokeWidth="2.5" opacity="0.85" />

          <circle cx="68" cy="82" r="4" fill="#38bdf8" />
          <circle cx="84" cy="72" r="4" fill="#38bdf8" />
          <circle cx="98" cy="82" r="4" fill="#38bdf8" />
          <circle cx="76" cy="94" r="4" fill="#38bdf8" />
          <circle cx="94" cy="92" r="4" fill="#38bdf8" />
          <circle cx="85" cy="83" r="5" fill="#fff" />

          {/* Upward Arrow */}
          <path
            d="M 88 110 L 115 88 L 132 98 L 158 32 M 158 32 L 134 40 M 158 32 L 150 56"
            stroke="url(#arrowGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.15, flexShrink: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#fff', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
            睿仔云
          </div>
          <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Reywoo Cloud
          </div>
        </div>
      )}
    </div>
  );
}
