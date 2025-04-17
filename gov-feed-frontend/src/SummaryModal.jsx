import React from 'react';
import './App.css';

export default function SummaryModal({ isOpen, onClose, content }) {
  if (!isOpen) return null;

  // Split the content by bullet points
  const bulletPoints = content
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(point => point.trim());

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        color: '#fff',
        padding: '24px 32px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '90%',
        boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
        position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute',
          top: 12,
          right: 16,
          background: 'none',
          color: '#aaa',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
        }}>✖</button>

        <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>TL;DR</h2>

        {bulletPoints.length > 0 ? (
          <ul style={{ paddingLeft: '1.25rem' }}>
            {bulletPoints.map((point, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem' }}>{point.slice(1).trim()}</li>
            ))}
          </ul>
        ) : (
          <p style={{ fontStyle: 'italic', color: '#ccc' }}>{content}</p>
        )}
      </div>
    </div>
  );
}
