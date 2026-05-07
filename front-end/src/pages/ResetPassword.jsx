import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { addToast } = useToast();
  const isMounted = useRef(true);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    token: searchParams.get('token') || '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength state (mirroring Signup logic)
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    class: '',
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) {
      setFormData((prev) => ({ ...prev, email: emailFromUrl }));
    }
    if (!formData.token) {
      addToast('Invalid or missing reset token.', 'error');
    }
  }, [searchParams]); // only on mount and when searchParams change

  // Password strength calculation
  useEffect(() => {
    const password = formData.password;
    let score = 0;
    let label = '';
    let className = '';

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score === 0) {
      label = '';
      className = '';
    } else if (score <= 2) {
      label = 'Weak';
      className = 'weak';
    } else if (score <= 4) {
      label = 'Medium';
      className = 'medium';
    } else {
      label = 'Strong';
      className = 'strong';
    }

    if (isMounted.current) {
      setPasswordStrength({ score, label, class: className });
    }
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      addToast('Passwords do not match.', 'error');
      setLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      addToast('Password must be at least 8 characters.', 'error');
      setLoading(false);
      return;
    }

    const result = await resetPassword(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.token
    );

    if (result.success) {
      setSuccess(true);
      addToast('Password reset successfully! Redirecting...', 'success');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      addToast(result.error || 'Failed to reset password', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">Enter your new password below.</p>

        {/* General error div removed – toast handles all errors */}

        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-envelope"></i>
                </span>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">New Password</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-lock"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="8"
                />
                <button
                  type="button"
                  className="input-group-text"
                  style={{ borderLeft: 'none', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              {/* Password strength bar added */}
              {formData.password && (
                <div className="password-strength" role="progressbar">
                  <div className="d-flex justify-content-between">
                    <small className="password-strength-text">
                      {passwordStrength.label && `Password Strength: ${passwordStrength.label}`}
                    </small>
                  </div>
                  <div className="password-strength-bar">
                    <div className={`password-strength-fill ${passwordStrength.class}`}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label">Confirm New Password</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-lock"></i>
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="input-group-text"
                  style={{ borderLeft: 'none', cursor: 'pointer' }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <Button variant="auth" type="submit" loading={loading}>
              Reset Password
            </Button>
          </form>
        )}

        <div className="auth-footer">
          <span>
            Remember your password? <Link to="/login">Login</Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;