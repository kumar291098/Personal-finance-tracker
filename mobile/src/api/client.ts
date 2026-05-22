import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from './config';

/**
 * Helper function to securely retrieve tokens across both Web and Mobile platforms
 */
export const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  }
  return await SecureStore.getItemAsync('userToken');
};

/**
 * Helper function to retrieve the logged in User ID
 */
export const getUserId = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userId');
  }
  return await SecureStore.getItemAsync('userId');
};

/**
 * An authenticated fetch wrapper that automatically attaches the JWT token
 */
export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = await response.text() || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like DELETE)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};
