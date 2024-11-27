// frontend/src/components/Navbar.tsx

import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// frontend/src/components/Navbar.tsx

const Navbar: React.FC = () => {
  const { user, signOut, loading } = useContext(AuthContext);

  return (
    <nav>
      <h1>Six Nations Fixture Scheduling</h1>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        {!loading && user && ['admin', 'manager', 'viewer'].includes(user.role) && (
          <li>
            <Link to="/teams">Teams</Link>
          </li>
        )}
        {!loading && user ? (
          <>
            <li>
              Welcome, {user.firstName} ({user.role})
            </li>
            <li>
              <button onClick={signOut}>Sign Out</button>
            </li>
          </>
        ) : (
          !loading && (
            <>
              <li>
                <Link to="/signup">Sign Up</Link>
              </li>
              <li>
                <Link to="/signin">Sign In</Link>
              </li>
            </>
          )
        )}
      </ul>
    </nav>
  );
};


export default Navbar;
