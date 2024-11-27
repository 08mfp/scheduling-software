// frontend/src/components/SignUp.tsx
import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SignUp: React.FC = () => {
  const { signUp } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'guest',
    secretCode: '',
  });

  const [error, setError] = useState<string | null>(null);

  const { firstName, lastName, email, password, role, secretCode } = formData;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(firstName, lastName, email, password, role, secretCode);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={onSubmit}>
        <div>
          <label>First Name:</label>
          <input name="firstName" value={firstName} onChange={onChange} required />
        </div>
        <div>
          <label>Last Name:</label>
          <input name="lastName" value={lastName} onChange={onChange} required />
        </div>
        <div>
          <label>Email:</label>
          <input name="email" type="email" value={email} onChange={onChange} required />
        </div>
        <div>
          <label>Password:</label>
          <input name="password" type="password" value={password} onChange={onChange} required />
        </div>
        <div>
          <label>Role:</label>
          <select name="role" value={role} onChange={onChange}>
            <option value="guest">Guest</option>
            <option value="viewer">Viewer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {(role === 'manager' || role === 'admin') && (
          <div>
            <label>Secret Code:</label>
            <input name="secretCode" value={secretCode} onChange={onChange} required />
          </div>
        )}
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default SignUp;
