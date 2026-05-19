import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lock, Settings, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchProfile,
  updateProfile
} from '../../services/profileService';
import './Profile.css';

const defaultPreferences = {
  theme: localStorage.getItem('financeTheme') || 'light',
  notifications: {
    email: true,
    push: false,
    weekly: true,
    monthly: true
  },
  privacy: {
    profileVisible: false,
    dataSharing: false
  }
};

const Profile = () => {
  const { user, token, logout, updateSession } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState(defaultProfile(user));
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferences, setPreferences] = useState(() => ({
    ...defaultPreferences,
    ...readStorage('financePreferences', {}),
    notifications: {
      ...defaultPreferences.notifications,
      ...(readStorage('financePreferences', {}).notifications || {})
    },
    privacy: {
      ...defaultPreferences.privacy,
      ...(readStorage('financePreferences', {}).privacy || {})
    }
  }));

  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      setError('');
      try {
        const data = await fetchProfile(token);
        const normalized = normalizeProfile(data);
        setProfileData(normalized);
      } catch (err) {
        setError(err.message || 'Unable to load profile.');
      }
    };

    loadProfile();
  }, [token]);

  const showMessage = (text) => {
    setError('');
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2500);
  };

  const updatePreference = (section, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      const result = await updateProfile(token, profileData);
      const normalized = normalizeProfile(result);
      setProfileData(normalized);
      updateSession(result);
      showMessage(result.message || 'Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('New passwords do not match.');
      return;
    }

    localStorage.setItem('financePasswordUpdatedAt', new Date().toISOString());
    showMessage('Password preference saved locally. Connect backend API for real password updates.');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePreferencesSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem('financePreferences', JSON.stringify(preferences));
    localStorage.setItem('financeTheme', resolveTheme(preferences.theme));
    applyTheme(preferences.theme);
    showMessage('Preferences saved and applied.');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      showMessage('Account deletion needs a backend delete-account API before it can run.');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
  ];

  return (
    <div className="profile-page">
      <div className="profile-header-card">
        <div className="profile-header-content">
          <p className="profile-kicker">Settings</p>
          <h1 className="profile-title">Account Settings</h1>
          <p className="profile-subtitle">Manage your account information and preferences.</p>
        </div>

        <div className="user-avatar-large">
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>

      {message && (
        <div className="profile-message">
          <ShieldCheck size={18} />
          {message}
        </div>
      )}
      {error && (
        <div className="profile-message error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="profile-content">
        <div className="profile-sidebar">
          <nav className="profile-nav">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon"><Icon size={20} /></span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="profile-main">
          {activeTab === 'profile' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Profile Information</h2>
                <p className="section-subtitle">Update your personal information and contact details</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="form-row">
                  <ProfileField label="Username" value={profileData.username} onChange={value => setProfileData(prev => ({ ...prev, username: value }))} required />
                  <ProfileField label="Email" type="email" value={profileData.email} onChange={value => setProfileData(prev => ({ ...prev, email: value }))} placeholder="your@email.com" />
                </div>

                <div className="form-row">
                  <ProfileField label="First Name" value={profileData.firstName} onChange={value => setProfileData(prev => ({ ...prev, firstName: value }))} placeholder="John" />
                  <ProfileField label="Last Name" value={profileData.lastName} onChange={value => setProfileData(prev => ({ ...prev, lastName: value }))} placeholder="Doe" />
                </div>

                <div className="form-row">
                  <ProfileField label="Phone" type="tel" value={profileData.phone} onChange={value => setProfileData(prev => ({ ...prev, phone: value }))} placeholder="+91 98765 43210" />
                  <ProfileField label="Date of Birth" type="date" value={profileData.dateOfBirth} onChange={value => setProfileData(prev => ({ ...prev, dateOfBirth: value }))} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      value={profileData.gender}
                      onChange={(event) => setProfileData(prev => ({ ...prev, gender: event.target.value }))}
                      className="form-select"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select
                      value={profileData.currency}
                      onChange={(event) => setProfileData(prev => ({ ...prev, currency: event.target.value }))}
                      className="form-select"
                    >
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Security Settings</h2>
                <p className="section-subtitle">Keep your account secure by updating your password</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="profile-form">
                <ProfileField label="Current Password" type="password" value={passwordData.currentPassword} onChange={value => setPasswordData(prev => ({ ...prev, currentPassword: value }))} required />
                <ProfileField label="New Password" type="password" value={passwordData.newPassword} onChange={value => setPasswordData(prev => ({ ...prev, newPassword: value }))} minLength={6} required />
                <ProfileField label="Confirm New Password" type="password" value={passwordData.confirmPassword} onChange={value => setPasswordData(prev => ({ ...prev, confirmPassword: value }))} minLength={6} required />

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Change Password</button>
                </div>
              </form>

              <div className="security-info">
                <h3 className="info-title">Security Tips</h3>
                <ul className="security-tips">
                  <li>Use a strong password with at least 8 characters</li>
                  <li>Include uppercase, lowercase, numbers, and symbols</li>
                  <li>Do not reuse passwords from other accounts</li>
                  <li>Consider using a password manager</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Preferences</h2>
                <p className="section-subtitle">Customize your experience and notification settings</p>
              </div>

              <form onSubmit={handlePreferencesSubmit} className="profile-form">
                <div className="preference-section">
                  <h3 className="preference-title">Appearance</h3>
                  <div className="form-group">
                    <label className="form-label">Theme</label>
                    <select
                      value={preferences.theme}
                      onChange={(event) => setPreferences(prev => ({ ...prev, theme: event.target.value }))}
                      className="form-select"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                </div>

                <div className="preference-section">
                  <h3 className="preference-title">Notifications</h3>
                  <div className="checkbox-group">
                    <PreferenceCheckbox label="Email notifications" checked={preferences.notifications.email} onChange={checked => updatePreference('notifications', 'email', checked)} />
                    <PreferenceCheckbox label="Push notifications" checked={preferences.notifications.push} onChange={checked => updatePreference('notifications', 'push', checked)} />
                    <PreferenceCheckbox label="Weekly reports" checked={preferences.notifications.weekly} onChange={checked => updatePreference('notifications', 'weekly', checked)} />
                    <PreferenceCheckbox label="Monthly summaries" checked={preferences.notifications.monthly} onChange={checked => updatePreference('notifications', 'monthly', checked)} />
                  </div>
                </div>

                <div className="preference-section">
                  <h3 className="preference-title">Privacy</h3>
                  <div className="checkbox-group">
                    <PreferenceCheckbox label="Make profile visible to others" checked={preferences.privacy.profileVisible} onChange={checked => updatePreference('privacy', 'profileVisible', checked)} />
                    <PreferenceCheckbox label="Allow anonymous data sharing for improvements" checked={preferences.privacy.dataSharing} onChange={checked => updatePreference('privacy', 'dataSharing', checked)} />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Save Preferences</button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Danger Zone</h2>
                <p className="section-subtitle">Irreversible and destructive actions</p>
              </div>

              <div className="danger-section">
                <div className="danger-item">
                  <div className="danger-info">
                    <h3 className="danger-title">Logout from all devices</h3>
                    <p className="danger-description">This will log you out from this browser session.</p>
                  </div>
                  <button className="btn btn-secondary" onClick={logout}>Logout Everywhere</button>
                </div>

                <div className="danger-item">
                  <div className="danger-info">
                    <h3 className="danger-title">Delete Account</h3>
                    <p className="danger-description">Permanently delete your account and all associated data. This needs a backend endpoint before it can run.</p>
                  </div>
                  <button className="btn btn-error" onClick={handleDeleteAccount}>Delete Account</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfileField = ({ label, value, onChange, type = 'text', ...props }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="form-input"
      {...props}
    />
  </div>
);

const PreferenceCheckbox = ({ label, checked, onChange }) => (
  <label className="checkbox-wrapper">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="checkbox-label">{label}</span>
  </label>
);

const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

const defaultProfile = (user) => ({
  username: user?.username || '',
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  currency: 'INR'
});

const normalizeProfile = (data) => ({
  username: data.username || '',
  email: data.email || '',
  firstName: data.firstName || '',
  lastName: data.lastName || '',
  phone: data.phone || '',
  gender: data.gender || '',
  dateOfBirth: data.dateOfBirth || '',
  currency: data.currency || 'INR'
});

const resolveTheme = (theme) => {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return theme;
};

const applyTheme = (theme) => {
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolvedTheme);
};

export default Profile;
