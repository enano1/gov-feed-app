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
        style={{
          padding: '12px 24px',
          fontSize: '1rem',
          borderRadius: '9999px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Get Started
      </button>
    </div>
  );
}

