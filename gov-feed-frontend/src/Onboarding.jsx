import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const keyframesStyle = `
  @keyframes chipPopIn {
    0% {
      transform: scale(0.7);
      opacity: 0.5;
    }
    60% {
      transform: scale(1.15);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

export default function Onboarding() {
  const [topics, setTopics] = useState([]);
  const [lastAddedIndex, setLastAddedIndex] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    await fetch('http://localhost:8080/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ topics }),
    });
    navigate('/feed'); // Proceed to feed after onboarding
  };

  return (
    <div style={containerStyle}>
      <style>{keyframesStyle}</style>
      <div style={boxStyle}>
        <h1 style={titleStyle}>What topics are you interested in?</h1>

        <div style={inputContainerStyle}>
          {topics.map((t, i) => (
            <div
              key={i}
              style={{
                ...chipStyle,
                animation: i === lastAddedIndex ? 'chipPopIn 0.4s ease-out' : undefined,
              }}
            >
              {t}
              <button
                onClick={() => setTopics(prev => prev.filter((_, index) => index !== i))}
                style={chipButtonStyle}
                aria-label={`Remove ${t}`}
              >
                ×
              </button>
            </div>
          ))}

          <input
            type="text"
            placeholder={topics.length === 0 ? "e.g. Cybersecurity, Defense" : ""}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = e.target.value.trim();
                if (value !== '') {
                  setTopics(prev => [...prev, value]);
                  setLastAddedIndex(topics.length); // Track last index
                  e.target.value = '';
                }
              }
            }}
            style={inputStyle}
          />
          <span style={arrowStyle}>↵</span>
        </div>

        <button
          onClick={handleSubmit}
          onMouseEnter={e => {
            e.target.style.borderColor = '#9333ea';
            e.target.style.boxShadow = '0 0 0 2px rgba(147, 51, 234, 0.5)';
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = '#333';
            e.target.style.boxShadow = 'none';
          }}
          style={buttonStyle}
        >
          Finish Setup →
        </button>
      </div>
    </div>
  );
}

// Styles
const containerStyle = {
  width: '100vw',
  height: '100vh',
  backgroundColor: '#111',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const boxStyle = {
  textAlign: 'center',
  padding: '2rem',
  maxWidth: '500px',
  width: '100%',
  borderRadius: '4px',
};

const titleStyle = {
  fontSize: '2rem',
  marginBottom: '1.5rem',
  color: 'white',
};

const inputContainerStyle = {
  width: '100%',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '9999px',
  padding: '8px 12px',
  minHeight: '48px',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
};

const chipStyle = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#444',
  color: 'white',
  padding: '10px 12px',
  borderRadius: '9999px',
  fontSize: '0.8rem',
  margin: '4px',
};

const chipButtonStyle = {
  marginLeft: '6px',
  background: 'transparent',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '1rem',
  marginRight: '6px',
  padding: 0,
};

const inputStyle = {
  flex: 1,
  minWidth: '120px',
  border: 'none',
  outline: 'none',
  fontSize: '1rem',
  color: '#fff',
  backgroundColor: 'transparent',
  padding: '6px 0',
};

const arrowStyle = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#aaa',
  fontSize: '1rem',
  pointerEvents: 'none',
};

const buttonStyle = {
  marginTop: '2rem',
  padding: '12px 24px',
  fontSize: '1rem',
  borderRadius: '9999px',
  backgroundColor: '#111',
  color: 'white',
  border: '1px solid #333',
  cursor: 'pointer',
  transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
};
