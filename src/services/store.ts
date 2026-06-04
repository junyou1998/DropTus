import { reactive, ref } from "vue";
import { getAuthState, saveAuthState, Profile, UploadTemplate, getFolders, Folder, setOnTokenRefreshed } from "./directus";
import { Store } from "@tauri-apps/plugin-store";

export interface UploadHistoryItem {
  id: string;
  name: string;
  size: number;
  url: string;
  thumbnailUrl: string;
  time: string;
  status: "pending" | "success" | "failed";
  mimeType: string;
}

export const appState = reactive({
  activeProfileId: null as string | null,
  activeTemplateId: null as string | null,
  profiles: [] as Profile[],
  templates: [] as UploadTemplate[],
  theme: "system" as "light" | "dark" | "system",
  folders: [] as Folder[],
  sidebarCollapsed: false,
});

export const activeProfile = ref<Profile | null>(null);
export const activeTemplate = ref<UploadTemplate | null>(null);
export const history = ref<UploadHistoryItem[]>([]);

let store: Store | null = null;
async function getStore() {
  if (!store) store = await Store.load("settings.json");
  return store;
}

export async function updateTheme() {
  const isDark =
    appState.theme === "dark" ||
    (appState.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export async function refreshFolders() {
  if (activeProfile.value) {
    appState.folders = await getFolders();
  } else {
    appState.folders = [];
  }
}

export async function saveAppState() {
  await saveAuthState({
    activeProfileId: appState.activeProfileId,
    profiles: appState.profiles,
    theme: appState.theme,
    activeTemplateId: appState.activeTemplateId,
    templates: appState.templates,
    sidebarCollapsed: appState.sidebarCollapsed,
  });
  activeProfile.value = appState.profiles.find((p) => p.id === appState.activeProfileId) || null;
  activeTemplate.value = appState.templates.find((t) => t.id === appState.activeTemplateId) || null;
  updateTheme();
  await refreshFolders();
}

export async function syncAppStateWithStore() {
  const auth = await getAuthState(true);
  appState.activeProfileId = auth.activeProfileId;
  appState.activeTemplateId = auth.activeTemplateId;
  appState.profiles = auth.profiles;
  appState.templates = auth.templates;
  appState.theme = auth.theme;
  appState.sidebarCollapsed = !!auth.sidebarCollapsed;

  activeProfile.value = appState.profiles.find((p) => p.id === appState.activeProfileId) || null;
  activeTemplate.value = appState.templates.find((t) => t.id === appState.activeTemplateId) || null;

  updateTheme();
  await refreshFolders();
}

export async function initApp() {
  const auth = await getAuthState();
  appState.activeProfileId = auth.activeProfileId;
  appState.activeTemplateId = auth.activeTemplateId;
  appState.profiles = auth.profiles;
  appState.templates = auth.templates;
  appState.theme = auth.theme;
  appState.sidebarCollapsed = !!auth.sidebarCollapsed;

  activeProfile.value = appState.profiles.find((p) => p.id === appState.activeProfileId) || null;
  activeTemplate.value = appState.templates.find((t) => t.id === appState.activeTemplateId) || null;

  const s = await getStore();
  const savedHistory = await s.get<UploadHistoryItem[]>("history");
  history.value = savedHistory || [];

  updateTheme();

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (appState.theme === "system") {
      updateTheme();
    }
  });

  await refreshFolders();

  // 跨視窗歷史紀錄同步監聽
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("history-updated", async () => {
      const storeInstance = await getStore();
      try {
        await storeInstance.reload();
      } catch (reloadErr) {
        console.warn("Store reload failed:", reloadErr);
      }
      const updatedHistory = await storeInstance.get<UploadHistoryItem[]>("history");
      history.value = updatedHistory || [];
    });

    // 跨視窗 App State 同步監聽
    await listen("app-state-updated", async () => {
      await syncAppStateWithStore();
    });
  } catch (eventErr) {
    console.warn("跨視窗監聽失敗（可能不在 Tauri 環境）：", eventErr);
  }
}

export async function saveHistory() {
  const s = await getStore();
  await s.set("history", history.value);
  await s.save();

  // 廣播跨視窗更新事件
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit("history-updated");
  } catch (eventErr) {
    // 忽略網頁預覽環境時的錯誤
  }
}

export async function addHistoryItem(item: UploadHistoryItem) {
  history.value.unshift(item);
  await saveHistory();
}

export async function deleteHistoryItem(id: string) {
  history.value = history.value.filter((h) => h.id !== id);
  await saveHistory();
}

setOnTokenRefreshed((refreshedProfile) => {
  const index = appState.profiles.findIndex((p) => p.id === refreshedProfile.id);
  if (index >= 0) {
    appState.profiles[index] = refreshedProfile;
  }
  activeProfile.value = appState.profiles.find((p) => p.id === appState.activeProfileId) || null;
});

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info" | "error";
  duration?: number;
}

export const toasts = ref<ToastMessage[]>([]);

export function showToast(message: string, type: ToastMessage["type"] = "success", duration = 3000) {
  const id = `${Date.now()}-${Math.random()}`;
  toasts.value.push({ id, message, type, duration });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, duration);
}
