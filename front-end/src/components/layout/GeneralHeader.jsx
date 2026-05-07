import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const pageTitles = {
  '/profile': 'Profile Settings',
  // Add more pages as needed
};

const GeneralHeader = ({ onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const currentTitle = pageTitles[location.pathname] || 'Page';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="header">
      <button
        className="mobile-menu-toggle"
        type="button"
        onClick={onMenuToggle}
      >
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>☰</span>
      </button>
      <h1>{currentTitle}</h1>

      {/* Desktop controls - hidden on mobile via stats class */}
      
      <div className="stats" style={{ gap: '15px' }}>
        <div className="filters" style={{ marginBottom: 0 }}>
          <button
            className={`filter-btn ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            Dashboard
          </button>
          <button
            className={`filter-btn ${location.pathname === '/profile' ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            Profile
          </button>
        </div>

        <button
          className="btn btn-secondary"
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt me-2"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

export default GeneralHeader;