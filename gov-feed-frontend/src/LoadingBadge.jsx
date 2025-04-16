// src/LoadingBadge.jsx
import React from 'react';

export default function LoadingBadge() {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 30,
  };

  const rocketStyle = {
    fontSize: '3rem',
    animation: 'rocketFly 1.5s linear infinite',
    transform: 'translateX(0)',
  };

  const textStyle = {
    marginTop: '12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#aaa',
  };

  const keyframes = `
    @keyframes rocketFly {
      0%   { transform: translateX(-150px) rotate(-20deg); opacity: 0; }
      25%  { opacity: 1; }
      50%  { transform: translateX(0px) rotate(0deg); }
      75%  { opacity: 1; }
      100% { transform: translateX(150px) rotate(20deg); opacity: 0; }
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{keyframes}</style>
      <div style={rocketStyle}>🚀</div>
      <div style={textStyle}>Launching articles...</div>
    </div>
  );
}
