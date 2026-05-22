import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from './config';

export const login = async (username: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(await response.text() || 'Login failed');
  const data = await response.json();
  if (data.token) {
    if (Platform.OS === 'web') {
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userId', String(data.userId));
      localStorage.setItem('username', data.username);
      localStorage.setItem('accessLevel', data.accessLevel || 'FREE');
    } else {
      await SecureStore.setItemAsync('userToken', data.token);
      await SecureStore.setItemAsync('userId', String(data.userId));
      await SecureStore.setItemAsync('username', data.username);
      await SecureStore.setItemAsync('accessLevel', data.accessLevel || 'FREE');
    }
  }
  return data;
};

export const register = async (payload: {
  username: string;
  password: string;
  email?: string;
  phone?: string;
}) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text() || 'Registration failed');
  return await response.json();
};

export const requestOtp = async (identifier: string) => {
  const response = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  if (!response.ok) throw new Error(await response.text() || 'OTP request failed');
  return await response.json();
};

export const verifyOtpAndReset = async (identifier: string, otp: string, newPassword: string) => {
  const response = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp, newPassword }),
  });
  if (!response.ok) throw new Error(await response.text() || 'OTP verification failed');
  return await response.json();
};
