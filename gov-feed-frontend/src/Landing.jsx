// src/Landing.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import FloatingChipsBackground from './FloatingChipsBackground';


export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{
        backgroundColor: '#111',
        color: 'white',
        height: '100vh',
        width: '100vw',
        position: 'relative', // <-- Important
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
      <FloatingChipsBackground />

      <div
  style={{
    backgroundColor: 'rgba(17, 17, 17, 0.6)', // semi-transparent dark background
    backdropFilter: 'blur(8px)',              // this blurs the background behind it
    WebkitBackdropFilter: 'blur(8px)',        // Safari support
    borderRadius: '1rem',
    padding: '2rem 3rem',
    zIndex: 2,                                // ensure it’s above the background
    position: 'relative',                     // necessary for stacking
    boxShadow: '0 0 30px rgba(0,0,0,0.2)'      // subtle depth
  }}
>
  <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
    Stay ahead in defense + gov tech.
  </h1>
  <p style={{ marginBottom: '2rem', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto' }}>
    Get updates on military innovation, cybersecurity, government opportunities, and more.
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
            marginTop: '1rem',
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
</div>
  );
}

