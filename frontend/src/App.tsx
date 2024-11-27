// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import FixturesList from './components/FixturesList';
import TeamsList from './components/TeamsList';
import TeamDetail from './components/TeamDetail';
import TeamForm from './components/TeamForm';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import PrivateRoute from './components/PrivateRoute';
import Unauthorized from './components/Unauthorized';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="container">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<FixturesList />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />

            {/* Unauthorized Page */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes: Accessible to authenticated users with appropriate roles */}
            <Route element={<PrivateRoute requiredRoles={['admin', 'manager', 'viewer']} />}>
              <Route path="/teams" element={<TeamsList />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
            </Route>

            {/* Admin-Only Routes */}
            <Route element={<PrivateRoute requiredRoles={['admin']} />}>
              <Route path="/teams/add" element={<TeamForm />} />
              <Route path="/teams/edit/:id" element={<TeamForm />} />
            </Route>

            {/* Catch-All Route */}
            <Route path="*" element={<Unauthorized />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
