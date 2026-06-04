import { reactive, ref } from "vue";
import { getAuthState, saveAuthState, Profile, UploadTemplate, getFolders, Folder, setOnTokenRefreshed } from "./directus";
import { Store } from "@tauri-apps/plugin-store";
import { locale, detectLocale, LocaleType } from "./i18n";

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
  language: "" as string, // 空字串代表自動偵測系統語系
});

export const activeProfile = ref<Profile | null>(null);
export const activeTemplate = ref<UploadTemplate | null>(null);
export const history = ref<UploadHistoryItem[]>([]);

let store: Store | null = null;
async function getStore() {
  if (!store) store = await Store.load("settings.json");
  return store;
}

export function updateLocale() {
  if (appState.language) {
    locale.value = appState.language as LocaleType;
  } else {
    locale.value = detectLocale();
  }
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
  try {
    await saveAuthState({
      activeProfileId: appState.activeProfileId,
      profiles: appState.profiles,
      theme: appState.theme,
      activeTemplateId: appState.activeTemplateId,
      templates: appState.templates,
      sidebarCollapsed: appState.sidebarCollapsed,
      language: appState.language,
    });
    activeProfile.value = appState.profiles.find((p) => p.id === appState.activeProfileId) || null;
    activeTemplate.value = appState.templates.find((t) => t.id === appState.activeTemplateId) || null;
    updateTheme();
    updateLocale();
    await refreshFolders();
  } catch (err: any) {
    console.error("Failed to save app state:", err);
    showToast(`儲存設定失敗: ${err.message || err}`, "error");
  }
}

export async function syncAppStateWithStore() {
  try {
    const auth = await getAuthState(true);
    console.log(`[Store Sync] Loaded auth state. language: "${auth.language}"`);
    appState.activeProfileId = auth.activeProfileId;
    appState.activeTemplateId = auth.activeTemplateId;
    appState.profiles = auth.profiles;
    appState.templates = auth.templates;
    appState.theme = auth.theme;
    appState.sidebarCollapsed = !!auth.sidebarCollapsed;
    appState.language = auth.language || "";

    activeProfile.value = appState.profiles.find((p) => p.id === appState.activeProfileId) || null;
    activeTemplate.value = appState.templates.find((t) => t.id === appState.activeTemplateId) || null;

    updateTheme();
    updateLocale();

    // 只有 main 視窗需要載入 Directus 資料夾，tray 視窗不渲染資料夾選單，跳過此步以防止 Token 刷新引發的死循環
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const currentWin = getCurrentWindow();
      if (currentWin.label === "main") {
        await refreshFolders();
      }
    } catch (e) {
      console.warn("Failed to check window label for folder refresh:", e);
    }
  } catch (err: any) {
    console.error("Failed to sync app state:", err);
  }
}

export async function initApp() {
  try {
    const auth = await getAuthState();
    appState.activeProfileId = auth.activeProfileId;
    appState.activeTemplateId = auth.activeTemplateId;
    appState.profiles = auth.profiles;
    appState.templates = auth.templates;
    appState.theme = auth.theme;
    appState.sidebarCollapsed = !!auth.sidebarCollapsed;
    appState.language = auth.language || "";

    activeProfile.value = appState.profiles.find((p) => p.id === appState.activeProfileId) || null;
    activeTemplate.value = appState.templates.find((t) => t.id === appState.activeTemplateId) || null;

    const s = await getStore();
    const savedHistory = await s.get<UploadHistoryItem[]>("history");
    history.value = savedHistory || [];
  } catch (err: any) {
    console.error("Initialization warning (Settings/History):", err);
    showToast(`初始化設定失敗，將使用預設值: ${err.message || err}`, "error");
  }

  // 確保無論如何都載入主題與語言
  updateTheme();
  updateLocale();

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (appState.theme === "system") {
      updateTheme();
    }
  });

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const currentWin = getCurrentWindow();
    if (currentWin.label === "main") {
      await refreshFolders();
    }
  } catch (folderErr) {
    console.warn("Failed to refresh folders during init:", folderErr);
  }

  // 跨視窗歷史紀錄同步監聽
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen("history-updated", async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const currentWin = getCurrentWindow();
        console.log(`[Store Event] history-updated received in window: ${currentWin.label}`);
        // 只有非 main 視窗 (即 tray 視窗) 需要從磁碟重載歷史，因為 main 視窗已在記憶體中更新
        if (currentWin.label !== "main") {
          const storeInstance = await getStore();
          try {
            await storeInstance.reload();
          } catch (reloadErr) {
            console.warn("Store reload failed:", reloadErr);
          }
          const updatedHistory = await storeInstance.get<UploadHistoryItem[]>("history");
          history.value = updatedHistory || [];
          console.log(`[Store Event] History synced. New items count: ${history.value.length}`);
        }
      } catch (err) {
        console.warn("History sync failed:", err);
      }
    });

    // 跨視窗 App State 同步監聽
    await listen("app-state-updated", async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const currentWin = getCurrentWindow();
        console.log(`[Store Event] app-state-updated received in window: ${currentWin.label}`);
        // 只有非 main 視窗 (即 tray 視窗) 需要從 store 同步，避免 main 視窗自己寫入後又載入舊快取的 Race Condition
        if (currentWin.label !== "main") {
          console.log(`[Store Event] Window is not main (${currentWin.label}), triggering syncAppStateWithStore`);
          await syncAppStateWithStore();
          console.log(`[Store Event] Sync finished. Current appState.language is: ${appState.language}, locale is: ${locale.value}`);
        }
      } catch (err) {
        console.error("[Store Event] Error during app-state-updated:", err);
        await syncAppStateWithStore();
      }
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
