import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import Login from './Login';
import Signup from './Signup';
import Onboarding from './Onboarding';
import Feed from './Feed';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/feed" element={<Feed />} />
      </Routes>
    </Router>
  );
}
