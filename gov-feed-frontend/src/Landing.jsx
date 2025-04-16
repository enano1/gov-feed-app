// src/Landing.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{
      backgroundColor: '#111',
      color: 'white',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    //   padding: '2rem',
      overflow: 'hidden'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Stay ahead in defense + gov tech.
      </h1>
      <p style={{ marginBottom: '2rem', fontSize: '1.2rem', maxWidth: '500px' }}>
        Get real-time updates on military innovation, cybersecurity, government opportunities, and more.
      </p>
      <button
        onClick={() => navigate('/login')}
        onMouseEnter={e => {
            e.target.style.borderColor = '#9333ea'; // purple
            e.target.style.boxShadow = '0 0 0 2px rgba(147, 51, 234, 0.5)';
        }}
        onMouseLeave={e => {
            e.target.style.borderColor = '#333';
            e.target.style.boxShadow = 'none';
        }}
        style={{
            padding: '12px 24px',
            fontSize: '1rem',
            borderRadius: '9999px',
            backgroundColor: '#111',
            color: 'white',
            border: '1px solid #333',
            cursor: 'pointer',
            transition: 'box-shadow 0.25s ease, border-color 0.25s ease'
        }}
        >
        Get Started
        </button>
    </div>
  );
}

