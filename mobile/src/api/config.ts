import Constants from 'expo-constants';
import { Platform } from 'react-native';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

// Detect local development environment
const isDev = __DEV__;

const isLocalWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const localApiUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8080/api'
    : 'http://localhost:8080/api';

// Production API URL of the hosted backend service on Render
const productionApiUrl = 'https://personal-finane-tracker.onrender.com/api';

// Fallback to local URL in development/local web testing, otherwise default to production
const fallbackApiUrl = isDev || isLocalWeb ? localApiUrl : productionApiUrl;

const configuredApiUrl =
  (isLocalWeb ? localApiUrl : undefined) ||
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl;

export const API_URL = trimTrailingSlash(configuredApiUrl || fallbackApiUrl);
