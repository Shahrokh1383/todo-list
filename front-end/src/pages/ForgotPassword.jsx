import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await forgotPassword(email);
    
    if (result.success) {
      addToast('Reset link generated. Redirecting...', 'success');
      const { token, email: userEmail } = result.data;
      navigate(`/reset-password?token=${token}&email=${encodeURIComponent(userEmail)}`);
    } else {
      addToast(result.error || 'Failed to send reset link', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">
          Enter your email address and we will help you reset your password.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="form-label">Email</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-envelope"></i>
              </span>
              <input
                type="email"
                className="form-control"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <Button variant="auth" type="submit" loading={loading}>
            Find Account
          </Button>
        </form>

        <div className="auth-footer">
          <span>
            Remember your password? <Link to="/login">Login</Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;