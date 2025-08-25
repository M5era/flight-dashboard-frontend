import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import Login from './pages/Login.tsx';
import SignUp from './pages/SignUp.tsx';
// import SavedFlights from './pages/SavedFlights.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
  {/* <Route path="/saved-flights" element={<SavedFlights />} /> */}
      </Routes>
    </Router>
  </React.StrictMode>,
);
