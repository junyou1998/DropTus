import { fetch } from "@tauri-apps/plugin-http";
import { Store } from "@tauri-apps/plugin-store";
import SparkMD5 from "spark-md5";

let onTokenRefreshedCallback: ((profile: Profile) => void) | null = null;
export function setOnTokenRefreshed(cb: (profile: Profile) => void) {
  onTokenRefreshedCallback = cb;
}

export interface Profile {
  id: string;
  name: string;
  serverUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UploadTemplate {
  id: string;
  name: string;
  folderId: string | null;
  renamePattern: string;
  checkDuplicate: boolean;
  collectionName: string;
  fileFieldName: string;
  dynamicFields: Array<{ name: string; type: string; label: string; value: string; options?: string[] }>;
  linkFormat: "url" | "markdown" | "html" | "custom";
  customPattern: string;
  useS3Url?: boolean;
  s3UrlPrefix?: string;
}

export interface AuthState {
  activeProfileId: string | null;
  profiles: Profile[];
  theme: "light" | "dark" | "system";
  activeTemplateId: string | null;
  templates: UploadTemplate[];
  sidebarCollapsed?: boolean;
  language?: string;
}

export interface Folder {
  id: string;
  name: string;
}

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await Store.load("settings.json");
  }
  return store;
}

export async function getAuthState(forceReload: boolean = false): Promise<AuthState> {
  const s = await getStore();
  if (forceReload) {
    try {
      await s.reload();
    } catch (err) {
      console.warn("Store reload failed in directus:", err);
    }
  }
  const state = await s.get<AuthState>("auth_state");
  return state || {
    activeProfileId: null,
    profiles: [],
    theme: "system",
    activeTemplateId: null,
    templates: [],
    sidebarCollapsed: false,
    language: "",
  };
}

export async function saveAuthState(state: AuthState): Promise<void> {
  const s = await getStore();
  await s.set("auth_state", state);
  await s.save();

  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit("app-state-updated");
  } catch (e) {
    // 忽略網頁預覽等非 Tauri 環境時的錯誤
  }
}

export async function login(
  serverUrl: string,
  email: string,
  password: string,
  profileName: string
): Promise<Profile> {
  const formattedUrl = serverUrl.replace(/\/$/, "");
  const response = await fetch(`${formattedUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.message || "登入失敗，請檢查帳密與伺服器網址");
  }

  const { data } = await response.json();
  const profile: Profile = {
    id: `${formattedUrl}-${email}`,
    name: profileName,
    serverUrl: formattedUrl,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires,
  };

  const state = await getAuthState();
  const index = state.profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    state.profiles[index] = profile;
  } else {
    state.profiles.push(profile);
  }
  state.activeProfileId = profile.id;
  await saveAuthState(state);

  return profile;
}

export async function testNewConnection(
  serverUrl: string,
  email: string,
  password: string
): Promise<void> {
  const formattedUrl = serverUrl.replace(/\/$/, "");
  const response = await fetch(`${formattedUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.message || "連線測試失敗，請檢查帳密與伺服器網址");
  }
}

export async function testProfileConnection(profileId: string): Promise<void> {
  const state = await getAuthState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error("找不到對應的 Profile 設定");

  let token = profile.accessToken;
  const bufferTime = 30000;
  if (Date.now() + bufferTime >= profile.expiresAt) {
    const refreshed = await refreshProfileToken(profileId);
    token = refreshed.accessToken;
  }

  const response = await fetch(`${profile.serverUrl}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`連線測試失敗 (狀態碼 ${response.status})`);
  }
}

export async function getActiveProfile(): Promise<Profile | null> {
  const state = await getAuthState();
  if (!state.activeProfileId) return null;
  return state.profiles.find((p) => p.id === state.activeProfileId) || null;
}

export async function refreshProfileToken(profileId: string): Promise<Profile> {
  const state = await getAuthState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error("找不到對應的 Profile 設定");

  const response = await fetch(`${profile.serverUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: profile.refreshToken,
      mode: "json",
    }),
  });

  if (!response.ok) {
    profile.accessToken = "";
    profile.expiresAt = 0;
    await saveAuthState(state);
    throw new Error("憑證更新失敗，請重新登入");
  }

  const { data } = await response.json();
  profile.accessToken = data.access_token;
  profile.refreshToken = data.refresh_token;
  profile.expiresAt = Date.now() + data.expires;

  await saveAuthState(state);
  onTokenRefreshedCallback?.(profile);
  return profile;
}

export async function getValidAccessToken(): Promise<string> {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("請先登入並設定連線資訊");

  const bufferTime = 30000;
  if (Date.now() + bufferTime >= profile.expiresAt) {
    try {
      const refreshed = await refreshProfileToken(profile.id);
      return refreshed.accessToken;
    } catch (e) {
      throw new Error("連線已過期，請重新登入");
    }
  }

  return profile.accessToken;
}

export async function directusRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("請先登入並設定連線資訊");

  const token = await getValidAccessToken();
  const url = `${profile.serverUrl}/${path.replace(/^\//, "")}`;

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.message || `請求失敗 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function getFolders(): Promise<Folder[]> {
  try {
    const res = await directusRequest<{ data: any[] }>("/folders?limit=-1");
    return res.data.map((f: any) => ({
      id: f.id,
      name: f.name,
    }));
  } catch (e) {
    return [];
  }
}

export function calculateMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice || (File.prototype as any).mozSlice || (File.prototype as any).webkitSlice;
    const chunkSize = 2097152;
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer);
      }
      currentChunk++;
      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    fileReader.onerror = () => reject(new Error("無法讀取檔案以計算 MD5"));

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    }

    loadNext();
  });
}

export function formatFilename(pattern: string, originalName: string): string {
  if (!pattern) return originalName;

  const dotIndex = originalName.lastIndexOf(".");
  const ext = dotIndex >= 0 ? originalName.slice(dotIndex + 1) : "";
  const nameWithoutExt = dotIndex >= 0 ? originalName.slice(0, dotIndex) : originalName;

  const now = new Date();
  const y = now.getFullYear().toString();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");

  let result = pattern
    .replace(/{y}/g, y)
    .replace(/{m}/g, m)
    .replace(/{d}/g, d)
    .replace(/{filename}/g, nameWithoutExt)
    .replace(/{ext}/g, ext);

  result = result.replace(/{rand:(\d+)}/g, (_, len) => {
    const length = parseInt(len, 10) || 4;
    let str = "";
    for (let i = 0; i < length; i++) {
      str += Math.floor(Math.random() * 10).toString();
    }
    return str;
  });

  result = result.replace(/{uuid:(\d+)}/g, (_, len) => {
    const length = parseInt(len, 10) || 6;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let str = "";
    for (let i = 0; i < length; i++) {
      str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return str;
  });

  if (!result.endsWith(`.${ext}`) && ext) {
    result = `${result}.${ext}`;
  }

  return result;
}

export async function uploadToDirectus(
  file: File,
  folderId: string | null,
  renamePattern: string,
  checkDuplicate: boolean,
  onProgress?: (progress: number) => void
): Promise<{ id: string; name: string; url: string; filename_disk?: string; isDuplicate?: boolean }> {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("請先登入並設定連線資訊");

  const md5 = await calculateMD5(file);

  if (checkDuplicate) {
    try {
      const res = await directusRequest<{ data: any[] }>(
        `/files?filter[description][_eq]=${md5}`
      );
      if (res.data && res.data.length > 0) {
        const existing = res.data[0];
        // 如果防重找到的檔案原本不在選定的資料夾，則為其更新資料夾
        if (folderId && existing.folder !== folderId) {
          try {
            await directusRequest(`/files/${existing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ folder: folderId }),
            });
          } catch (e) {
            console.warn("更新防重檔案的資料夾失敗，繼續傳回檔案:", e);
          }
        }
        onProgress?.(100);
        return {
          id: existing.id,
          name: existing.filename_download,
          filename_disk: existing.filename_disk,
          url: `${profile.serverUrl}/assets/${existing.id}`,
          isDuplicate: true,
        };
      }
    } catch (e) {
      // 忽略防重查詢錯誤，繼續正常上傳
    }
  }

  const finalFilename = formatFilename(renamePattern, file.name);
  const renamedFile = new File([file], finalFilename, { type: file.type });

  const token = await getValidAccessToken();
  const formData = new FormData();
  formData.append("file", renamedFile);

  // 由於 Tauri HTTP 插件的 fetch 無法原生簡單監聽上傳進度，我們將在此處直接進行傳輸，並在完成後返回。
  const response = await fetch(`${profile.serverUrl}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.message || "檔案上傳至 Directus 失敗");
  }

  const { data } = await response.json();

  // 若有指定資料夾，或是需要寫入 MD5 資訊
  const patchData: any = {};
  if (folderId) {
    patchData.folder = folderId;
  }
  if (checkDuplicate) {
    patchData.description = md5;
  }

  if (Object.keys(patchData).length > 0) {
    try {
      await directusRequest(`/files/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
    } catch (patchErr) {
      console.warn("更新全新上傳檔案之屬性 (資料夾/MD5) 失敗:", patchErr);
    }
  }

  onProgress?.(100);

  return {
    id: data.id,
    name: data.filename_download,
    filename_disk: data.filename_disk,
    url: `${profile.serverUrl}/assets/${data.id}`,
    isDuplicate: false,
  };
}

export async function associateCollection(
  fileId: string,
  collectionName: string,
  fileFieldName: string,
  dynamicFields: Array<{ name: string; value: any }>,
  isDuplicate: boolean = false
): Promise<any> {
  const body: Record<string, any> = {
    [fileFieldName]: fileId,
  };

  for (const field of dynamicFields) {
    body[field.name] = field.value;
  }

  // 若為重複上傳檔案，我們去查詢該 Collection 中，是否已經有一筆關聯了這個 fileId
  if (isDuplicate) {
    try {
      const res = await directusRequest<{ data: any[] }>(
        `/items/${collectionName}?filter[${fileFieldName}][_eq]=${fileId}`
      );
      if (res.data && res.data.length > 0) {
        const existingItem = res.data[0];
        const itemId = existingItem.id;
        if (itemId) {
          // 執行 PATCH 更新
          return await directusRequest(`/items/${collectionName}/${itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      }
    } catch (err) {
      console.warn(`尋找 existing collection item 失敗，將會 fallback 到新建 (POST) 關聯:`, err);
    }
  }

  // 全新檔案，或是雖為重複檔案但在 Collection 中找不到關聯資料，則 POST 新增一筆
  return directusRequest(`/items/${collectionName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
