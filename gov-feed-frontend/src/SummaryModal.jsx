// src/SummaryModal.jsx
import React from 'react';

export default function SummaryModal({ isOpen, onClose, content }) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeStyle} onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '1rem' }}>TL;DR</h2>
        <p style={{ color: '#eee' }}>{content}</p>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999
};

const modalStyle = {
  backgroundColor: '#1a1a1a',
  color: '#fff',
  padding: '2rem',
  borderRadius: '12px',
  maxWidth: '600px',
  width: '90%',
  boxShadow: '0 0 10px rgba(0,0,0,0.4)',
  position: 'relative',
};

const closeStyle = {
  position: 'absolute',
  top: 10,
  right: 15,
  fontSize: '1.5rem',
  background: 'none',
  color: '#aaa',
  border: 'none',
  cursor: 'pointer',
};
