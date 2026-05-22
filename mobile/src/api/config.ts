import Constants from 'expo-constants';
import { Platform } from 'react-native';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl;

export const API_URL = trimTrailingSlash(
  configuredApiUrl ||
    (Platform.OS === 'android'
      ? 'http://10.0.2.2:8080/api'
      : 'http://localhost:8080/api')
);
