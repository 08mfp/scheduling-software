// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import FixturesList from './components/FixturesList';
import FixtureForm from './components/FixtureForm';
import TeamsList from './components/TeamsList';
import TeamDetail from './components/TeamDetail';
import TeamForm from './components/TeamForm';
import StadiumList from './components/StadiumList';
import StadiumDetail from './components/StadiumDetail';
import StadiumForm from './components/StadiumForm';
import PlayersList from './components/PlayersList';
import PlayerDetail from './components/PlayerDetail';
import PlayerForm from './components/PlayerForm';
import GenerateFixtures from './components/GenerateFixtures';
import ManualFixtureScheduler from './components/ManualFixtureScheduler';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import AdminPanel from './pages/AdminPanel';
import PrivateRoute from './components/PrivateRoute';
import Profile from './pages/Profile';
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
            <Route path="/fixtures" element={<FixturesList />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />

            {/* Unauthorized Page */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes: Accessible to authenticated users with appropriate roles */}
            <Route element={<PrivateRoute requiredRoles={['admin', 'manager', 'viewer']} />}>
              <Route path="/teams" element={<TeamsList />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route path="/stadiums" element={<StadiumList />} />
              <Route path="/stadiums/:id" element={<StadiumDetail />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Manager and Admin Routes */}
            <Route element={<PrivateRoute requiredRoles={['admin', 'manager']} />}>
              <Route path="/players" element={<PlayersList />} />
              <Route path="/players/:id" element={<PlayerDetail />} />
              <Route path="/players/add" element={<PlayerForm />} />
              <Route path="/players/edit/:id" element={<PlayerForm />} />
            </Route>

            {/* Admin-Only Routes */}
            <Route element={<PrivateRoute requiredRoles={['admin']} />}>
              <Route path="/teams/add" element={<TeamForm />} />
              <Route path="/teams/edit/:id" element={<TeamForm />} />
              <Route path="/stadiums/add" element={<StadiumForm />} />
              <Route path="/stadiums/edit/:id" element={<StadiumForm />} />
              <Route path="/fixtures/add" element={<FixtureForm />} />
              <Route path="/fixtures/edit/:id" element={<FixtureForm />} />
              <Route path="/generate-fixtures" element={<GenerateFixtures />} />
              <Route path="/manual-fixture-scheduler" element={<ManualFixtureScheduler />} />
              <Route path="/admin" element={<AdminPanel />} />
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
