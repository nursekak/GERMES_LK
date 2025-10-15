import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// import ConnectionStatus from './ConnectionStatus';

const Layout = () => {
  const [collapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: '📊',
      label: 'Панель управления',
    },
    {
      key: '/profile',
      icon: '👤',
      label: 'Профиль',
    },
    ...(isManager ? [
      {
        key: '/users',
        icon: '👥',
        label: 'Сотрудники',
      },
      {
        key: '/workplaces',
        icon: '🏢',
        label: 'Места работы',
      },
    ] : []),
    {
      key: '/attendance',
      icon: '⏰',
      label: 'Посещения',
    },
    {
      key: '/qr-scanner',
      icon: '📱',
      label: 'QR Сканер',
    },
    {
      key: '/reports',
      icon: '📄',
      label: 'Отчеты',
    },
    ...(isManager ? [
      {
        key: '/backup',
        icon: '💾',
        label: 'Резервные копии',
      },
    ] : []),
  ];

  const handleMenuClick = (key) => {
    navigate(key);
    setMobileDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      {!isMobile && (
        <div style={{
          width: collapsed ? '80px' : '250px',
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          transition: 'width 0.3s',
          position: 'fixed',
          height: '100vh',
          zIndex: 1000
        }}>
          <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, color: '#1890ff' }}>ГЕРМЕС</h3>
          </div>
          <nav style={{ padding: '16px 0' }}>
            {menuItems.map(item => (
              <div
                key={item.key}
                onClick={() => handleMenuClick(item.key)}
                style={{
                  padding: '12px 24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: location.pathname === item.key ? '#e6f7ff' : 'transparent',
                  borderRight: location.pathname === item.key ? '3px solid #1890ff' : 'none',
                  color: location.pathname === item.key ? '#1890ff' : '#333',
                  fontWeight: location.pathname === item.key ? '500' : 'normal'
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Mobile Drawer */}
      {isMobile && mobileDrawerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '250px',
          height: '100vh',
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1001,
          padding: '16px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, color: '#1890ff' }}>ГЕРМЕС</h3>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          <nav>
            {menuItems.map(item => (
              <div
                key={item.key}
                onClick={() => handleMenuClick(item.key)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: location.pathname === item.key ? '#e6f7ff' : 'transparent',
                  color: location.pathname === item.key ? '#1890ff' : '#333',
                  fontWeight: location.pathname === item.key ? '500' : 'normal',
                  marginBottom: '4px',
                  borderRadius: '6px'
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        marginLeft: isMobile ? '0' : (collapsed ? '80px' : '250px'),
        width: isMobile ? '100%' : `calc(100% - ${collapsed ? '80px' : '250px'})`,
        transition: 'all 0.3s'
      }}>
        {/* Header */}
        <header style={{
          background: '#fff',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <button
                onClick={() => setMobileDrawerOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  marginRight: '16px'
                }}
              >
                ☰
              </button>
            )}
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>
              Личный кабинет
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px'
              }}>
                👤
              </div>
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: '1px solid #d9d9d9',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Выход
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{
          margin: '24px',
          padding: '24px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minHeight: 'calc(100vh - 112px)',
        }}>
          {/* <ConnectionStatus /> */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;