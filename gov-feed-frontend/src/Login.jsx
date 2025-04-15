import { useState } from 'react';

function Login({ onLogin, switchToSignup }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
  
    const handleLogin = async () => {
      const res = await fetch('http://localhost:8080/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      res.ok ? onLogin() : setErr(data.error || 'Login failed');
    };
  
    return (
      <div>
        <h2>Login</h2>
        {err && <p style={{ color: 'red' }}>{err}</p>}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button onClick={handleLogin}>Log In</button>
        <p>Don't have an account? <button onClick={switchToSignup}>Sign up</button></p>
      </div>
    );
  }
  export default Login;
  