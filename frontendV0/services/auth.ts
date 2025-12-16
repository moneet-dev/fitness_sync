import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const TOKEN_KEY = 'auth_token';

// SecureStore only works in standalone apps, not in Expo Go
// Use AsyncStorage for Expo Go and web
const isExpoGo = Constants.appOwnership === 'expo';
const useAsyncStorage = isExpoGo || Platform.OS === 'web';

// Storage helpers that fallback to AsyncStorage on unsupported platforms
const secureSetItem = async (key: string, value: string) => {
  if (useAsyncStorage) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    // Fallback to AsyncStorage if SecureStore fails
    console.warn('SecureStore failed, using AsyncStorage fallback', err);
    await AsyncStorage.setItem(key, value);
  }
};

const secureGetItem = async (key: string): Promise<string | null> => {
  if (useAsyncStorage) {
    return await AsyncStorage.getItem(key);
  }
  
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    // Fallback to AsyncStorage if SecureStore fails
    console.warn('SecureStore failed, using AsyncStorage fallback', err);
    return await AsyncStorage.getItem(key);
  }
};

const secureDeleteItem = async (key: string) => {
  if (useAsyncStorage) {
    await AsyncStorage.removeItem(key);
    return;
  }
  
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    // Fallback to AsyncStorage if SecureStore fails
    console.warn('SecureStore failed, using AsyncStorage fallback', err);
    await AsyncStorage.removeItem(key);
  }
};

let token: string | null = null;

export const setAuthToken = async (newToken: string) => {
  token = newToken;
  // Debug log for development: token set
  try {
    // eslint-disable-next-line no-console
    console.log('[auth] setAuthToken (saved):', newToken ? `${newToken.substring(0, 10)}...` : null);
  } catch {}
  try {
    await secureSetItem(TOKEN_KEY, newToken);
  } catch (err) {
    console.warn('Failed to persist auth token', err);
  }
};

export const getAuthToken = () => token;

export const clearAuthToken = async () => {
  token = null;
  try {
    await secureDeleteItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Failed to delete auth token', err);
  }
};

// Call once at app start to populate in-memory token for synchronous callers
export const initAuth = async () => {
  if (token) return token;
  try {
    const t = await secureGetItem(TOKEN_KEY);
    token = t;
    // Debug log for development: token loaded
    try {
      // eslint-disable-next-line no-console
      console.log('[auth] initAuth loaded token:', token ? `${String(token).substring(0, 10)}...` : null);
    } catch {}
    return token;
  } catch (err) {
    console.warn('Failed to load persisted auth token', err);
    return null;
  }
};

export default {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  initAuth,
};

