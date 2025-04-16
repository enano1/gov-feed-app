import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const [topics, setTopics] = useState([]);
  const [orgUrl, setOrgUrl] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    await fetch('http://localhost:8080/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ topics, org_url: orgUrl }),
    });

    navigate('/feed'); // 🎯 move to feed
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>What topics are you interested in?</h1>

        <input
          type="text"
          placeholder="e.g. Cybersecurity, AI"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setTopics(prev => [...prev, e.target.value]);
              e.target.value = '';
            }
          }}
          style={styles.input}
        />

        <ul style={styles.list}>
          {topics.map((t, i) => (
            <li key={i} style={styles.listItem}>{t}</li>
          ))}
        </ul>

        <button onClick={handleSubmit} style={styles.button}>
          Finish Setup →
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#111',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    textAlign: 'center',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '0.8rem',
    borderRadius: '8px',
    border: 'none',
    marginTop: '1rem',
    fontSize: '1rem',
    backgroundColor: '#222',
    color: 'white',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    marginTop: '1rem',
  },
  listItem: {
    backgroundColor: '#222',
    marginBottom: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
  },
  button: {
    marginTop: '2rem',
    padding: '12px 24px',
    fontSize: '1rem',
    borderRadius: '9999px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  }
};
