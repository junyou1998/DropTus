<script setup lang="ts">
import { ref } from "vue";
import { appState, saveAppState, syncAppStateWithStore } from "../services/store";
import { login, testNewConnection, testProfileConnection } from "../services/directus";
import { t } from "../services/i18n";
import { Server, User, Lock, Plus, Trash, Check, AlertCircle, Eye, EyeOff, Activity, RefreshCw, Loader2, Pencil } from "lucide-vue-next";

const serverUrl = ref("");
const email = ref("");
const password = ref("");
const profileName = ref("");
const showPassword = ref(false);

const editingProfileId = ref<string | null>(null);
const isLoading = ref(false);
const isTestingNew = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

// 記錄列表中每個 Profile 的連線測試狀態
const testStates = ref<Record<string, "testing" | "success" | "failed" | null>>({});
const testErrors = ref<Record<string, string>>({});

function startEdit(profile: any) {
  editingProfileId.value = profile.id;
  profileName.value = profile.name;
  serverUrl.value = profile.serverUrl;
  email.value = "";
  password.value = "";
  errorMsg.value = "";
  successMsg.value = "";
}

function cancelEdit() {
  editingProfileId.value = null;
  profileName.value = "";
  serverUrl.value = "";
  email.value = "";
  password.value = "";
  errorMsg.value = "";
  successMsg.value = "";
}

async function handleLogin() {
  if (editingProfileId.value) {
    await handleSaveEdit();
  } else {
    await handleCreateProfile();
  }
}

async function handleCreateProfile() {
  if (!serverUrl.value || !email.value || !password.value || !profileName.value) {
    errorMsg.value = t("upload.errorNoProfile");
    return;
  }

  isLoading.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    await login(serverUrl.value, email.value, password.value, profileName.value);
    successMsg.value = t("common.success");
    // 清空輸入
    serverUrl.value = "";
    email.value = "";
    password.value = "";
    profileName.value = "";
    // 從儲存庫同步新登入的狀態到前端記憶體
    await syncAppStateWithStore();
  } catch (err: any) {
    console.error("Login error:", err);
    errorMsg.value = err.message || (typeof err === "string" ? err : JSON.stringify(err)) || t("auth.statusFailed");
  } finally {
    isLoading.value = false;
  }
}

async function handleSaveEdit() {
  if (!profileName.value || !serverUrl.value) {
    errorMsg.value = t("upload.errorNoProfile");
    return;
  }

  const orig = appState.profiles.find((p) => p.id === editingProfileId.value);
  if (!orig) return;

  const isUrlChanged = orig.serverUrl.replace(/\/$/, "") !== serverUrl.value.replace(/\/$/, "");
  const isAuthProvided = !!(email.value && password.value);

  isLoading.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    if (isUrlChanged || isAuthProvided) {
      // 如果改了網址，或提供了新帳密，就必須重新驗證登入
      if (!email.value || !password.value) {
        throw new Error(t("auth.tokenExpired"));
      }

      const oldId = editingProfileId.value;
      const formattedUrl = serverUrl.value.replace(/\/$/, "");

      // 重新登入（會 push 新 Profile）
      await login(serverUrl.value, email.value, password.value, profileName.value);

      // 若生成了新 ID，則將舊的刪除以防重複
      const newId = `${formattedUrl}-${email.value}`;
      if (newId !== oldId) {
        appState.profiles = appState.profiles.filter((p) => p.id !== oldId);
      }

      await saveAppState();
    } else {
      // 僅修改名稱，直接更新
      orig.name = profileName.value;
      await saveAppState();
    }

    successMsg.value = t("common.success");
    cancelEdit();
    await syncAppStateWithStore();
  } catch (err: any) {
    console.error("Save edit error:", err);
    errorMsg.value = err.message || t("auth.statusFailed");
  } finally {
    isLoading.value = false;
  }
}

async function handleTestNewConnection() {
  if (!serverUrl.value || !email.value || !password.value) {
    errorMsg.value = t("upload.errorNoProfile");
    return;
  }

  isTestingNew.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    await testNewConnection(serverUrl.value, email.value, password.value);
    successMsg.value = t("auth.statusConnected");
  } catch (err: any) {
    console.error("Test connection error:", err);
    errorMsg.value = err.message || t("auth.statusFailed");
  } finally {
    isTestingNew.value = false;
  }
}

async function handleTestProfileConnection(profileId: string) {
  testStates.value[profileId] = "testing";
  testErrors.value[profileId] = "";

  try {
    await testProfileConnection(profileId);
    testStates.value[profileId] = "success";
    // 4 秒後清除成功狀態，保持畫面乾淨
    setTimeout(() => {
      if (testStates.value[profileId] === "success") {
        testStates.value[profileId] = null;
      }
    }, 4000);
  } catch (err: any) {
    console.error(`Profile test error for ${profileId}:`, err);
    testStates.value[profileId] = "failed";
    testErrors.value[profileId] = err.message || t("auth.statusFailed");
  }
}

async function selectProfile(id: string) {
  appState.activeProfileId = id;
  await saveAppState();
}

async function deleteProfile(id: string) {
  if (confirm(t("auth.deleteConfirm"))) {
    appState.profiles = appState.profiles.filter((p) => p.id !== id);
    if (appState.activeProfileId === id) {
      appState.activeProfileId = appState.profiles[0]?.id || null;
    }
    await saveAppState();
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm">
      <h2 class="text-xl font-bold text-neutral-800 dark:text-white mb-4 flex items-center gap-2">
        <Server class="w-5 h-5 text-indigo-500" />
        {{ editingProfileId ? t("auth.editProfile") : t("auth.login") }}
      </h2>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">{{ t("auth.name") }}</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <User class="w-4 h-4" />
            </span>
            <input
              type="text"
              v-model="profileName"
              placeholder="e.g. My Directus Profile"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              class="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white text-sm transition-all"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">{{ t("auth.url") }}</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Server class="w-4 h-4" />
            </span>
            <input
              type="url"
              v-model="serverUrl"
              placeholder="https://directus.example.com"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              class="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white text-sm transition-all"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              {{ t("auth.email") }} <span v-if="editingProfileId" class="text-[10px] text-neutral-400 font-normal">({{ t("common.cancel") }})</span>
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <User class="w-4 h-4" />
              </span>
              <input
                type="email"
                v-model="email"
                placeholder="admin@example.com"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                class="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              {{ t("auth.password") }} <span v-if="editingProfileId" class="text-[10px] text-neutral-400 font-normal">({{ t("common.cancel") }})</span>
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Lock class="w-4 h-4" />
              </span>
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="••••••••"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                class="w-full pl-9 pr-10 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white text-sm transition-all"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="errorMsg" class="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ errorMsg }}</span>
        </div>

        <div v-if="successMsg" class="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
          <Check class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ successMsg }}</span>
        </div>

        <div class="flex flex-col sm:flex-row gap-4">
          <template v-if="editingProfileId">
            <button
              type="button"
              @click="cancelEdit"
              :disabled="isLoading"
              class="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/60 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{{ t("common.cancel") }}</span>
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-400 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check v-if="!isLoading" class="w-4 h-4" />
              <Loader2 v-else class="w-4 h-4 animate-spin" />
              <span>{{ isLoading ? t("common.saving") : t("common.save") }}</span>
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              @click="handleTestNewConnection"
              :disabled="isLoading || isTestingNew"
              class="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700/60 dark:hover:bg-neutral-700 disabled:bg-neutral-400 text-neutral-800 dark:text-neutral-200 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Activity v-if="!isTestingNew" class="w-4 h-4" />
              <Loader2 v-else class="w-4 h-4 animate-spin" />
              <span>{{ isTestingNew ? t("common.loading") : t("auth.statusConnected") }}</span>
            </button>
            <button
              type="submit"
              :disabled="isLoading || isTestingNew"
              class="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-400 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus v-if="!isLoading" class="w-4 h-4" />
              <span>{{ isLoading ? t("common.loading") : t("auth.addProfile") }}</span>
            </button>
          </template>
        </div>
      </form>
    </div>

    <div class="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm">
      <h2 class="text-xl font-bold text-neutral-800 dark:text-white mb-4">
        {{ t("auth.title") }}
      </h2>

      <div v-if="appState.profiles.length === 0" class="text-center py-6 text-neutral-400 text-sm">
        {{ t("common.noData") }}
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="profile in appState.profiles"
          :key="profile.id"
          @click="selectProfile(profile.id)"
          class="p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all"
          :class="
            profile.id === appState.activeProfileId
              ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
              : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
          "
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-all"
              :class="
                profile.id === appState.activeProfileId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
              "
            >
              <Check v-if="profile.id === appState.activeProfileId" class="w-4 h-4 shrink-0" />
              <span v-else class="text-xs">{{ profile.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div>
              <div class="font-medium text-neutral-800 dark:text-white text-sm">{{ profile.name }}</div>
              <div class="text-xs text-neutral-400 truncate max-w-xs">{{ profile.serverUrl }}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- 連線測試按鈕與狀態顯示 -->
            <div class="flex items-center mr-1">
              <button
                v-if="!testStates[profile.id] || testStates[profile.id] === 'success'"
                @click.stop="handleTestProfileConnection(profile.id)"
                class="p-1.5 text-neutral-400 hover:text-indigo-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer flex items-center gap-1"
                :title="t('auth.statusConnected')"
              >
                <RefreshCw v-if="!testStates[profile.id]" class="w-3.5 h-3.5" />
                <span v-else class="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                  <Check class="w-3 h-3" /> {{ t("auth.statusConnected") }}
                </span>
              </button>
              
              <div v-else-if="testStates[profile.id] === 'testing'" class="p-1.5 text-indigo-500 flex items-center gap-1 select-none">
                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                <span class="text-[10px]">{{ t("common.loading") }}</span>
              </div>
              
              <button
                v-else-if="testStates[profile.id] === 'failed'"
                @click.stop="handleTestProfileConnection(profile.id)"
                class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                :title="testErrors[profile.id] || t('auth.statusFailed')"
              >
                <AlertCircle class="w-3.5 h-3.5" />
                <span class="text-[10px] underline decoration-dotted">{{ t("auth.statusFailed") }}</span>
              </button>
            </div>

            <!-- 編輯此 Profile 按鈕 -->
            <button
              @click.stop="startEdit(profile)"
              class="p-1.5 text-neutral-400 hover:text-indigo-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer"
              :title="t('auth.editProfile')"
            >
              <Pencil class="w-4 h-4" />
            </button>

            <button
              @click.stop="deleteProfile(profile.id)"
              class="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer"
            >
              <Trash class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
