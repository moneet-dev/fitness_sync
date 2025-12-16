// Prefer configuring `extra.API_URL` in Expo app config for devices/emulators.
// Fallback to localhost for quick development. If you're running the app on
// a physical device, set the API_URL in `app.json` to your machine's LAN IP,
// e.g. `http://192.168.1.42:8000`.
import Constants from 'expo-constants';

const configured = (Constants.expoConfig && (Constants.expoConfig.extra as any)?.API_URL) || (Constants.manifest && (Constants.manifest.extra as any)?.API_URL);

export const API_URL = configured || 'http://0.0.0.0:8000';

// Helper in case other modules prefer a function
export const getApiUrl = () => API_URL;
