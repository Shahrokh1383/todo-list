import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import GeneralHeader from './GeneralHeader';
import { useAuth } from '../../context/AuthContext';

const GeneralLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-container" style={{ flexDirection: 'column' }}>
      <GeneralHeader onMenuToggle={toggleMenu} />

      {/* Mobile Menu Overlay */}
      <div
        id="sidebar-overlay"
        className={menuOpen ? 'active' : ''}
        onClick={closeMenu}
      />

      {/* Mobile Menu Panel (Slides from LEFT ➔) */}
      <div
        className="sidebar"
        style={{
          left: 0,
          right: 'auto',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          borderLeft: 'none',
        }}
      >
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button
            className={`filter-btn ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => { closeMenu(); navigate('/'); }}
          >
            Dashboard
          </button>
          <button
            className={`filter-btn ${location.pathname === '/profile' ? 'active' : ''}`}
            onClick={() => { closeMenu(); navigate('/profile'); }}
          >
            Profile
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt me-2"></i>
            Logout
          </button>
        </div>
      </div>

      <main style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-body)' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default GeneralLayout;