import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextSafe';
import { toast } from 'react-toastify';
import '../styles/utils.css';
import logoMain from '../assets/img/login/BYKI Lite Logo Main 2.png';

function Layout() {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // Helper function to get current section title
  const getCurrentSectionTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'Dashboard';
    if (path.includes('/inventory') || path.includes('/parts') || path.includes('/suppliers') || 
        path.includes('/purchase-orders') || path.includes('/stock-count')) return 'Inventory';    if (path.includes('/workshop') || path.includes('/work-orders') || path.includes('/schedule') ||
        path.includes('/customers') || path.includes('/mechanics')) return 'Workshop';
    if (path.includes('/finance') || path.includes('/mechanic-reports')) return 'Finance';
    
    return 'BYKI LITE';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="layout">
      <header className="top-bar">
        <div className="top-bar-left">
          <button 
            className="menu-toggle" 
            onClick={toggleSidebar} 
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 18H21V16H3V18ZM3 13H21V11H3V13ZM3 6V8H21V6H3Z" fill="currentColor"/>
            </svg>          </button>
          <div className="logo">
            <img 
              src={logoMain} 
              alt="BYKI Lite" 
              className="logo-image"
            />
          </div>
        </div>
        <div className="section-title">{getCurrentSectionTitle()}</div>
        <div className="top-bar-right">
          <button className="user-menu" aria-haspopup="true" aria-expanded="false">
            <span className="user-avatar">{currentUser.email?.charAt(0).toUpperCase()}</span>
          </button>
        </div>
      </header>
      
      <div className="breadcrumb-bar">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <NavLink to="/">Home</NavLink>
            </li>
            {location.pathname !== '/' && (
              <li className="breadcrumb-item active">{getCurrentSectionTitle()}</li>
            )}
          </ol>
        </nav>
      </div>
      
      <div className="content-container">
        <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-content">
            <ul className="sidebar-nav">
              <li className="sidebar-nav-section">
                <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="nav-text">Dashboard</span>
                </NavLink>
              </li>
                <li className="sidebar-nav-section">
                <NavLink to="/inventory" className={({ isActive }) => 
                  isActive || location.pathname.includes('/parts') || location.pathname.includes('/suppliers') ||
                  location.pathname.includes('/purchase-orders') || location.pathname.includes('/stock-count') 
                  ? 'active' : ''
                }>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V7H9V17ZM13 17H11V10H13V17ZM17 17H15V13H17V17Z" fill="currentColor"/>
                    </svg>
                  </span>                  <span className="nav-text">Inventory</span>
                </NavLink>
                {/* Inventory sub-navigation hidden - accessible via tabs within Inventory page */}
                <ul className="sidebar-subnav" style={{ display: 'none' }}>
                  <li>
                    <NavLink to="/suppliers" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Suppliers</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/parts" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Parts</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/purchase-orders" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Purchase Orders</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/stock-count" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Stock</span>
                    </NavLink>
                  </li>
                </ul>
              </li>
                <li className="sidebar-nav-section">                <NavLink to="/workshop" className={({ isActive }) => 
                  isActive || location.pathname.includes('/work-orders') || location.pathname.includes('/schedule') ||
                  location.pathname.includes('/customers') || location.pathname.includes('/mechanics')
                  ? 'active' : ''
                }>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.77 5.03L21.17 6.43L8.43 19.17L2.83 13.57L4.23 12.17L8.43 16.37L19.77 5.03Z" fill="currentColor"/>
                    </svg>
                  </span>                  <span className="nav-text">Workshop</span>
                </NavLink>
                {/* Workshop sub-navigation hidden - accessible via tabs within Workshop page */}
                <ul className="sidebar-subnav" style={{ display: 'none' }}>
                  <li>
                    <NavLink to="/work-orders" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Work Orders</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Customers</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/mechanics" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Mechanics</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Calendar</span>
                    </NavLink>
                  </li>
                </ul>
              </li>
                <li className="sidebar-nav-section">                <NavLink to="/finance" className={({ isActive }) => 
                  isActive || location.pathname.includes('/mechanic-reports')
                  ? 'active' : ''
                }>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.5 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="currentColor"/>
                    </svg>
                  </span>                  <span className="nav-text">Finance</span>
                </NavLink>
                {/* Finance sub-navigation hidden - accessible via tabs within Finance page */}
                <ul className="sidebar-subnav" style={{ display: 'none' }}>
                  <li>
                    <NavLink to="/mechanic-reports" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="nav-text">Financial Reports</span>
                    </NavLink>
                  </li>
                </ul>
              </li>
            </ul>
            
            <div className="sidebar-footer">
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </nav>        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
