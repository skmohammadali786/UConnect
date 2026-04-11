import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

export const STORAGE_KEYS = {
  USER: "@uconnect_user",
  POSTS: "@uconnect_posts",
  CHATS: "@uconnect_chats",
  NOTIFICATIONS: "@uconnect_notifications",
  NOTES: "@uconnect_notes",
  INTERNSHIPS: "@uconnect_internships",
  EVENTS: "@uconnect_events",
  TEAMS: "@uconnect_teams",
  CONFESSIONS: "@uconnect_confessions",
  HISTORY: "@uconnect_history",
  SEARCH_HISTORY: "@uconnect_search_history",
  INTERESTS: "@uconnect_interests",
  SETTINGS: "@uconnect_settings",
  DRAFT_POST: "@uconnect_draft_post",
};
