// frontend/src/components/PrivateRoute.tsx

import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

interface PrivateRouteProps {
  requiredRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRoles }) => {
  const { user } = useContext(AuthContext);

  // If user is not authenticated, redirect to sign-in page
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // If specific roles are required and the user does not have any of them, redirect to unauthorized
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If authenticated (and authorized), render the child routes
  return <Outlet />;
};

export default PrivateRoute;
