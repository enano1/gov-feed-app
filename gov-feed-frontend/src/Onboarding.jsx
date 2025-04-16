// src/Onboarding.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const [topics, setTopics] = useState([]);
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
      <div style={boxStyle}>
        <h1 style={titleStyle}>What topics are you interested in?</h1>

        <div style={inputContainerStyle}>
          {topics.map((t, i) => (
            <div key={i} style={chipStyle}>
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
            placeholder={topics.length === 0 ? "e.g. Cybersecurity, AI" : ""}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = e.target.value.trim();
                if (value !== '') {
                  setTopics(prev => [...prev, value]);
                  e.target.value = '';
                }
              }
            }}
            style={inputStyle}
          />
          <span style={arrowStyle}>↵</span>
        </div>

        <button onClick={handleSubmit} style={buttonStyle}>
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
//   backgroundColor: '#222',
  borderRadius: '4px',
};

const titleStyle = {
  fontSize: '2rem',
  marginBottom: '1.5rem',
  color: 'white'
};

const inputContainerStyle = {
  position: 'relative',
  width: '100%',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  backgroundColor: '#1a1a1a',
  border: '1px solid #444',
  borderRadius: '4px',
  padding: '4px',
  minHeight: '32px',
};

const chipStyle = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#444',
  color: 'white',
  padding: '3px 8px',
  borderRadius: '4px',
  fontSize: '0.8rem',
  marginRight: '6px',
  marginBottom: '4px'
};

const chipButtonStyle = {
  marginLeft: '6px',
  background: 'transparent',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '1rem',
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
  borderRadius: '9999px', // Very round
  backgroundColor: '#6c5ce7', // Purple button
  color: 'white',
  border: 'none',
  cursor: 'pointer',
};
