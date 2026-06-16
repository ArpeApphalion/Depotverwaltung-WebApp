import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FirebaseConfig } from './types';

export const CONFIG_KEY = 'depot_firebase_config';

export function getStoredConfig(): FirebaseConfig | null {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveConfig(config: FirebaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

export function initFirebase(config: FirebaseConfig) {
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}
