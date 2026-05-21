import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BellRing,
  ChartNoAxesCombined,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CreditCard,
  Crown,
  FolderTree,
  Gauge,
  ShieldCheck,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Wallet,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AiChatbot from '../ai/AiChatbot';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('financeTheme') ||
    document.documentElement.getAttribute('data-theme') ||
    document.body.getAttribute('data-theme') ||
    'light'
  );
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const { user, logout, canAccessPage, isAdmin } = useAuth();
  const navigate = useNavigate();
  const accessLevel = user?.accessLevel || 'FREE';
  const isSubscriber = accessLevel === 'SUBSCRIBER';
  const isAdminAccount = accessLevel === 'ADMIN' || user?.username === 'demo';
  const accountLabel = isAdminAccount ? 'Admin Account' : isSubscriber ? 'Subscriber Member' : 'Free Account';
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'User';
  const notifications = useMemo(() => {
    const nextNotifications = [];
    const subscriberUntil = user?.subscriberUntil ? new Date(user.subscriberUntil) : null;
    const hasSubscriptionDate = subscriberUntil && !Number.isNaN(subscriberUntil.getTime());

    if (!user?.email || !user?.phone) {
      nextNotifications.push({
        id: 'profile-incomplete',
        title: 'Complete your profile',
        body: 'Add email and phone so account recovery and profile details stay current.',
        path: '/profile',
        icon: CircleAlert
      });
    }

    if (isSubscriber || isAdminAccount) {
      nextNotifications.push({
        id: 'access-active',
        title: `${accessLevel} access active`,
        body: hasSubscriptionDate
          ? `Subscriber access runs until ${subscriberUntil.toLocaleDateString('en-IN')}.`
          : 'Your current account has advanced access.',
        path: '/profile',
        icon: CircleCheck
      });
    } else {
      nextNotifications.push({
        id: 'subscription-demo',
        title: 'Demo subscription available',
        body: 'Use a valid TEST-SUB demo UTR to activate subscriber access automatically.',
        path: '/subscription',
        icon: Crown
      });
    }

    if (canAccessPage('analytics')) {
      nextNotifications.push({
        id: 'analytics-ready',
        title: 'Analytics ready',
        body: 'Review category trends and monthly spending from your saved transactions.',
        path: '/analytics',
        icon: ChartNoAxesCombined
      });
    }

    if (canAccessPage('categories')) {
      nextNotifications.push({
        id: 'category-preferences',
        title: 'Category preferences',
        body: 'Edit or hide your own categories without affecting other users.',
        path: '/categories',
        icon: FolderTree
      });
    }

    if (isAdmin) {
      nextNotifications.push({
        id: 'ai-cache-monitoring',
        title: 'AI cache monitoring',
        body: 'Track Redis cache hits, misses, DB calls, and saved time in Monitoring.',
        path: '/monitoring',
        icon: Gauge
      });
    }

    return nextNotifications.map(notification => ({
      ...notification,
      unread: !readNotificationIds.includes(notification.id)
    }));
  }, [accessLevel, canAccessPage, isAdmin, isAdminAccount, isSubscriber, readNotificationIds, user]);
  const unreadCount = notifications.filter(notification => notification.unread).length;
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('financeTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (unreadCount === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setReadNotificationIds(notifications.map(notification => notification.id));
    }, 20000);

    return () => window.clearTimeout(timer);
  }, [notifications, unreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markNotificationsRead = () => {
    setReadNotificationIds(notifications.map(notification => notification.id));
  };

  const menuItems = [
    {
      path: '/dashboard',
      page: 'dashboard',
      icon: BarChart3,
      label: 'Dashboard',
      description: 'Overview & Analytics'
    },
    {
      path: '/transactions',
      page: 'transactions',
      icon: CreditCard,
      label: 'Transactions',
      description: 'Manage your money'
    },
    {
      path: '/access',
      page: 'access',
      icon: ShieldCheck,
      label: 'Access',
      description: 'User permissions',
      adminOnly: true
    },
    {
      path: '/monitoring',
      page: 'monitoring',
      icon: Gauge,
      label: 'Monitoring',
      description: 'Health & performance',
      adminOnly: true
    },
    {
      path: '/analytics',
      page: 'analytics',
      icon: ChartNoAxesCombined,
      label: 'Analytics',
      description: 'Insights & Reports'
    },
    {
      path: '/categories',
      page: 'categories',
      icon: FolderTree,
      label: 'Categories',
      description: 'Organize expenses'
    },
    {
      path: '/subscription',
      page: 'subscription',
      icon: Crown,
      label: 'Subscription',
      description: 'Upgrade access'
    },
    {
      path: '/profile',
      page: 'profile',
      icon: Settings,
      label: 'Profile',
      description: 'Account settings'
    }
  ];

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon"><Wallet size={22} /></span>
            <span className="logo-text">FinanceTracker</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.filter(item => (item.adminOnly ? isAdmin : canAccessPage(item.page))).map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'nav-link-active' : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="nav-icon"><Icon size={20} /></span>
                    <div className="nav-content">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">
                {user?.username || 'User'}
                {isSubscriber && <Crown size={14} className="member-inline-icon" />}
              </span>
              <span className={`user-role ${isSubscriber ? 'subscriber-role' : ''}`}>
                {isSubscriber && <Crown size={13} />}
                {accountLabel}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="header-actions">
            <div className="search-box">
              <span className="search-icon" aria-hidden="true"><Search size={16} /></span>
              <input
                type="text"
                placeholder="Search transactions..."
                className="search-input"
              />
            </div>

            <div className="header-buttons">
              <button
                className="theme-toggle-btn"
                type="button"
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="notification-menu">
                <button
                  className="notification-btn"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen(prev => !prev)}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="notification-panel">
                    <div className="notification-panel-header">
                      <h3>Notifications</h3>
                      <button type="button" onClick={markNotificationsRead}>
                        Mark read
                      </button>
                    </div>
                    <div className="notification-list">
                      {notifications.map(notification => {
                        const NotificationIcon = notification.icon || BellRing;
                        return (
                          <button
                            type="button"
                            key={notification.id}
                            className={`notification-item ${notification.unread ? 'unread' : ''}`}
                            onClick={() => {
                              setReadNotificationIds(prev => [...new Set([...prev, notification.id])]);
                              navigate(notification.path);
                              setNotificationsOpen(false);
                            }}
                          >
                            <span className="notification-dot" />
                            <span className="notification-icon">
                              <NotificationIcon size={16} />
                            </span>
                            <span>
                              <strong>{notification.title}</strong>
                              <small>{notification.body}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="user-menu">
                <button
                  className="user-menu-btn"
                  type="button"
                  onClick={() => navigate('/profile')}
                  title="Open profile"
                >
                  <div className="user-avatar-small">
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="user-name-header">{displayName}</span>
                  {isSubscriber && (
                    <span className="member-chip" title="Subscriber Member">
                      <Crown size={13} />
                      Member
                    </span>
                  )}
                  <span className="dropdown-arrow"><ChevronDown size={14} /></span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AiChatbot />
    </div>
  );
};

export default Layout;
