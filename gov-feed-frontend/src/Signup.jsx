import { useState } from 'react';

function Signup({ onSignup, switchToLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
  
    const handleSignup = async () => {
      const res = await fetch('http://localhost:8080/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      res.ok ? onSignup() : setErr(data.error || 'Signup failed');
    };
  
    return (
      <div>
        <h2>Sign Up</h2>
        {err && <p style={{ color: 'red' }}>{err}</p>}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button onClick={handleSignup}>Sign Up</button>
        <p>Already have an account? <button onClick={switchToLogin}>Log in</button></p>
      </div>
    );
  }
  export default Signup;
  