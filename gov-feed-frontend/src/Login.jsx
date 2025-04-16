import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await fetch('http://localhost:8080/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    res.ok ? navigate('/onboarding') : setErr(data.error || 'Login failed');
  };

  return (
    <div style={styles.container}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Login</h2>
      {err && <p style={{ color: 'red', marginBottom: '1rem' }}>{err}</p>}
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={styles.input}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={styles.input}
      />
      <button
        onClick={handleLogin}
        onMouseEnter={e => {
          e.target.style.borderColor = '#9333ea';
          e.target.style.boxShadow = '0 0 0 2px rgba(147, 51, 234, 0.5)';
        }}
        onMouseLeave={e => {
          e.target.style.borderColor = '#333';
          e.target.style.boxShadow = 'none';
        }}
        style={styles.button}
      >
        Log In
      </button>
      <p style={{ marginTop: '1rem' }}>
        Don't have an account?{' '}
        <button onClick={() => navigate('/signup')} style={styles.linkBtn}>
          Sign up
        </button>
      </p>
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  input: {
    width: '250px',
    padding: '12px',
    marginBottom: '1rem',
    borderRadius: '9999px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    outline: 'none',
    fontSize: '1rem',
  },
  button: {
    padding: '12px 24px',
    fontSize: '1rem',
    borderRadius: '9999px',
    backgroundColor: '#111',
    color: 'white',
    border: '1px solid #333',
    cursor: 'pointer',
    transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '1rem',
  },
};

export default Login;
