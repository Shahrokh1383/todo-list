import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../dashboard/Sidebar';
import Header from '../dashboard/Header';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Outlet />
      </main>

      <div 
        id="sidebar-overlay" 
        className={sidebarOpen ? 'active' : ''} 
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;