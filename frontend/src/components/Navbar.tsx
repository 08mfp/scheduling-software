// frontend/src/components/Navbar.tsx

import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, signOut } = useContext(AuthContext);

  return (
    <nav>
      <h1>Six Nations Fixture Scheduling</h1>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        {user && (
          <>
            {['admin', 'manager', 'viewer'].includes(user.role) && (
              <>
                <li>
                  <Link to="/teams">Teams</Link>
                </li>
                <li>
                  <Link to="/stadiums">Stadiums</Link>
                </li>
                <li>
                <Link to="/players">Players</Link>
              </li>
              </>
            )}
          </>
        )}
        {user ? (
          <>
            <li>
              Welcome, {user.firstName} ({user.role})
            </li>
            <li>
              <button onClick={signOut}>Sign Out</button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/signup">Sign Up</Link>
            </li>
            <li>
              <Link to="/signin">Sign In</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
