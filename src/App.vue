<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { initApp, activeProfile, appState, saveAppState, showToast, toasts } from "./services/store";
import { t } from "./services/i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import AuthManager from "./components/AuthManager.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import UploadPanel from "./components/UploadPanel.vue";
import HistoryList from "./components/HistoryList.vue";
import TrayPanel from "./components/TrayPanel.vue";
import { Upload, Settings, Database, Sun, Moon, Monitor, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Info, HelpCircle, X, Shield, AlertTriangle, Sparkles, Link2, Layers, FileCheck2, Globe, GitMerge, Github, Heart, ExternalLink } from "lucide-vue-next";
import { version as appVersion } from "../package.json";

const currentTab = ref<"upload" | "history" | "profiles" | "settings">("upload");
const isTrayWindow = ref(false);
const showLangMenu = ref(false);

const langOptions = computed(() => [
  { value: "", label: t("common.language.auto") },
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文 (台灣)" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
]);

// 更新檢查與贊助功能相關變數
const isCheckingUpdate = ref(false);
const latestVersion = ref("");
const changelogText = ref("");
const showUpdateModal = ref(false);

function isNewerVersion(current: string, latest: string): boolean {
  const cleanCur = current.replace(/^v/, "").trim();
  const cleanLat = latest.replace(/^v/, "").trim();
  if (cleanCur === cleanLat) return false;
  const curParts = cleanCur.split(".").map(x => parseInt(x, 10) || 0);
  const latParts = cleanLat.split(".").map(x => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
    const curVal = curParts[i] || 0;
    const latVal = latParts[i] || 0;
    if (latVal > curVal) return true;
    if (latVal < curVal) return false;
  }
  return false;
}

async function checkUpdate(manual = false) {
  if (isCheckingUpdate.value) return;
  isCheckingUpdate.value = true;
  try {
    const res = await fetch("https://api.github.com/repos/junyou1998/DropTus/releases/latest");
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    const latest = data.tag_name || "";
    const body = data.body || "";
    latestVersion.value = latest;
    changelogText.value = body;

    if (isNewerVersion(appVersion, latest)) {
      showUpdateModal.value = true;
    } else if (manual) {
      showToast(t("common.update.alreadyLatest"), "success");
    }
  } catch (err: any) {
    console.error("Check update failed:", err);
    if (manual) {
      showToast(t("common.update.failed").replace("{0}", err.message || err), "error");
    }
  } finally {
    isCheckingUpdate.value = false;
  }
}

async function openExternalUrl(url: string) {
  try {
    await openUrl(url);
  } catch (err) {
    console.error("Failed to open url:", err);
  }
}

onMounted(async () => {
  await initApp();
  try {
    const win = getCurrentWindow();
    isTrayWindow.value = win.label === "tray";
  } catch (e) {
    isTrayWindow.value = false;
  }

  // 監聽全域點擊以關閉語言下拉選單
  window.addEventListener("click", () => {
    showLangMenu.value = false;
  });

  // 啟動後延遲 3 秒靜默檢查更新
  setTimeout(() => {
    if (!isTrayWindow.value) {
      checkUpdate(false);
    }
  }, 3000);
});

async function toggleTheme() {
  if (appState.theme === "light") {
    appState.theme = "dark";
  } else if (appState.theme === "dark") {
    appState.theme = "system";
  } else {
    appState.theme = "light";
  }
  await saveAppState();
}

async function toggleSidebar() {
  appState.sidebarCollapsed = !appState.sidebarCollapsed;
  await saveAppState();
}

async function changeLang(lang: string) {
  appState.language = lang;
  showLangMenu.value = false;
  await saveAppState();
}

const showHelpModal = ref(false);
const activeHelpTab = ref<"intro" | "flow" | "details">("intro");
</script>

<template>
  <!-- 如果是托盤視窗，直接渲染 TrayPanel -->
  <div v-if="isTrayWindow" class="w-full h-screen bg-transparent">
    <TrayPanel />
  </div>

  <div v-else class="h-screen w-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex flex-col md:flex-row overflow-hidden transition-colors duration-200">
    <!-- 1. 小螢幕專用 Header (僅在 md 以下顯示，提供 macOS 交通號誌避讓 pl-20) -->
    <header 
      data-tauri-drag-region 
      class="h-12 bg-white dark:bg-neutral-900 border-b border-neutral-200/60 dark:border-neutral-800/80 px-6 flex items-center justify-between select-none cursor-default shrink-0 pl-20 md:hidden"
    >
      <!-- 左側 Logo 與標題 -->
      <div data-tauri-drag-region class="flex items-center gap-2 pointer-events-none select-none">
        <img src="/logo.png" alt="DropTus Logo" class="w-6 h-6 object-contain rounded-md" />
        <span class="text-xs font-black bg-linear-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
          DropTus
        </span>
        <span class="text-[9px] px-1 py-0.2 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500 rounded-md font-bold scale-90">
          v{{ appVersion }}
        </span>
      </div>

      <!-- 右側控制與指示器 -->
      <div class="flex items-center gap-4">
        <!-- GitHub 按鈕 -->
        <button
          @click="openExternalUrl('https://github.com/junyou1998/DropTus')"
          class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
          title="GitHub"
        >
          <Github class="w-4 h-4" />
        </button>

        <!-- 新手說明按鈕 -->
        <button
          @click="showHelpModal = true"
          class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center animate-fade-in"
          :title="t('sidebar.help')"
        >
          <HelpCircle class="w-4 h-4" />
        </button>

        <!-- 語言切換選單 -->
        <div class="relative">
          <button
            @click.stop="showLangMenu = !showLangMenu"
            class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            :title="t('common.language.select')"
          >
            <Globe class="w-4 h-4" />
          </button>
          
          <div
            v-if="showLangMenu"
            class="absolute right-0 mt-2 w-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl shadow-xl z-50 py-1.5"
            @click.stop
          >
            <button
              v-for="lang in langOptions"
              :key="lang.value"
              @click="changeLang(lang.value)"
              class="w-full px-4 py-2 text-left text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
              :class="appState.language === lang.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'"
            >
              <span>{{ lang.label }}</span>
              <span v-if="appState.language === lang.value" class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
            </button>
          </div>
        </div>

        <!-- 主題切換按鈕 -->
        <button
          @click="toggleTheme"
          class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
          :title="
            appState.theme === 'light' ? t('common.theme.descLight') :
            appState.theme === 'dark' ? t('common.theme.descDark') :
            t('common.theme.descSystem')
          "
        >
          <Sun v-if="appState.theme === 'light'" class="w-4 h-4" />
          <Moon v-else-if="appState.theme === 'dark'" class="w-4 h-4" />
          <Monitor v-else class="w-4 h-4" />
        </button>

        <!-- 連線狀態指示器 -->
        <div class="flex items-center gap-2 border-l border-neutral-200/60 dark:border-neutral-800/80 pl-4">
          <span
            class="w-2 h-2 rounded-full"
            :class="activeProfile ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-red-400'"
          ></span>
          <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {{ activeProfile ? activeProfile.name : t('common.disconnected') }}
          </span>
        </div>
      </div>
    </header>

    <!-- 2. 導覽側邊欄/導覽列 (小螢幕時為橫向頂部導覽，大螢幕時為左側側邊欄) -->
    <div 
      class="w-full md:h-screen shrink-0 flex flex-row md:flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-200/60 dark:border-neutral-800/80 transition-[width,padding] duration-300 bg-white dark:bg-neutral-900 p-3 md:pt-6 md:pb-3"
      :class="[
        appState.sidebarCollapsed 
          ? 'md:w-16 md:px-0' 
          : 'md:w-48 md:pl-4 md:pr-3'
      ]"
    >
      <!-- 上半部：Logo 與導覽頁籤 -->
      <div class="flex flex-row md:flex-col gap-4 w-full items-center md:items-stretch">
        <!-- 側邊欄頂部 Logo 區塊 (僅在 md 以上大螢幕顯示，提供 macOS 拖曳區，預留 pt-12 以避開交通號誌) -->
        <div 
          data-tauri-drag-region 
          class="select-none cursor-default items-center shrink-0 transition-all duration-300 hidden md:flex"
          :class="[
            appState.sidebarCollapsed 
              ? 'flex-col justify-center pt-12 pb-4 px-0 w-full' 
              : 'gap-2 px-1 pt-12 pb-4 w-full'
          ]"
        >
          <div class="w-8 h-8 flex items-center justify-center shrink-0 pointer-events-none select-none">
            <img src="/logo.png" alt="DropTus Logo" class="w-full h-full object-contain rounded-lg" />
          </div>
          <div v-if="!appState.sidebarCollapsed" class="min-w-0 pointer-events-none select-none">
            <div class="flex items-center gap-1.5 mb-0.5">
              <h1 class="text-xs font-black tracking-tight bg-linear-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent truncate">
                DropTus
              </h1>
              <span class="text-[9px] px-1 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 rounded-md font-bold scale-90">
                v{{ appVersion }}
              </span>
            </div>
            <p class="text-[9px] text-neutral-400 font-medium truncate">Upload to Directus</p>
          </div>
        </div>

        <!-- 導覽按鈕群組 (小螢幕時為 flex-row，大螢幕為 flex-col) -->
        <div 
          class="flex flex-row md:flex-col gap-1.5 md:gap-2 w-full flex-wrap justify-center md:justify-start"
          :class="appState.sidebarCollapsed ? 'md:items-center' : 'md:items-stretch'"
        >
          <button
            @click="currentTab = 'upload'"
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold"
            :class="[
              currentTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            :title="t('sidebar.upload')"
          >
            <Upload class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">{{ t('sidebar.upload') }}</span>
          </button>

          <button
            @click="currentTab = 'history'"
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold"
            :class="[
              currentTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            :title="t('sidebar.history')"
          >
            <Clock class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">{{ t('sidebar.history') }}</span>
          </button>

          <button
            @click="currentTab = 'profiles'"
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold"
            :class="[
              currentTab === 'profiles'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            :title="t('sidebar.profiles')"
          >
            <Database class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">{{ t('sidebar.profiles') }}</span>
          </button>

          <button
            @click="currentTab = 'settings'"
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold"
            :class="[
              currentTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            :title="t('sidebar.settings')"
          >
            <Settings class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">{{ t('sidebar.settings') }}</span>
          </button>
        </div>
      </div>

      <!-- 下半部：收合與版本 -->
      <div 
        class="hidden md:flex flex-col gap-2 w-full pb-1 shrink-0"
        :class="appState.sidebarCollapsed ? 'items-center' : 'items-stretch'"
      >
        <!-- 收合按鈕 -->
        <button
          @click="toggleSidebar"
          class="flex items-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 cursor-pointer transition-all select-none"
          :class="[
            appState.sidebarCollapsed 
              ? 'w-10 h-10 rounded-xl justify-center p-0' 
              : 'w-full px-4 py-2.5 rounded-2xl justify-start gap-2.5 text-xs font-semibold'
          ]"
          :title="appState.sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapsed')"
        >
          <ChevronRight v-if="appState.sidebarCollapsed" class="w-4 h-4 shrink-0" />
          <ChevronLeft v-else class="w-4 h-4 shrink-0" />
          <span v-if="!appState.sidebarCollapsed" class="whitespace-nowrap">{{ t('sidebar.collapsed') }}</span>
        </button>
      </div>
    </div>

    <!-- 3. 右側主要區塊 (僅在大螢幕 md 時包含 Header，內容區則共用) -->
    <div class="flex-1 flex flex-col overflow-hidden h-full">
      <!-- 大螢幕專用 Header (僅在 md 以上大螢幕顯示) -->
      <header 
        data-tauri-drag-region 
        class="h-12 bg-white dark:bg-neutral-900 border-b border-neutral-200/60 dark:border-neutral-800/80 px-6 flex items-center justify-end select-none cursor-default shrink-0 hidden md:flex"
      >
        <!-- 右側控制與指示器 -->
        <div class="flex items-center gap-4">
          <!-- GitHub 按鈕 -->
          <button
            @click="openExternalUrl('https://github.com/junyou1998/DropTus')"
            class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            title="GitHub"
          >
            <Github class="w-4 h-4" />
          </button>

          <!-- 新手說明按鈕 -->
          <button
            @click="showHelpModal = true"
            class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center animate-fade-in"
            :title="t('sidebar.help')"
          >
            <HelpCircle class="w-4 h-4" />
          </button>

          <!-- 語言切換選單 -->
          <div class="relative">
            <button
              @click.stop="showLangMenu = !showLangMenu"
              class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              :title="t('common.language.select')"
            >
              <Globe class="w-4 h-4" />
            </button>
            
            <div
              v-if="showLangMenu"
              class="absolute right-0 mt-2 w-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl shadow-xl z-50 py-1.5"
              @click.stop
            >
              <button
                v-for="lang in langOptions"
                :key="lang.value"
                @click="changeLang(lang.value)"
                class="w-full px-4 py-2 text-left text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                :class="appState.language === lang.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'"
              >
                <span>{{ lang.label }}</span>
                <span v-if="appState.language === lang.value" class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              </button>
            </div>
          </div>

          <!-- 主題切換按鈕 -->
          <button
            @click="toggleTheme"
            class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            :title="
              appState.theme === 'light' ? t('common.theme.descLight') :
              appState.theme === 'dark' ? t('common.theme.descDark') :
              t('common.theme.descSystem')
            "
          >
            <Sun v-if="appState.theme === 'light'" class="w-4 h-4" />
            <Moon v-else-if="appState.theme === 'dark'" class="w-4 h-4" />
            <Monitor v-else class="w-4 h-4" />
          </button>

          <!-- 連線狀態指示器 -->
          <div class="flex items-center gap-2 border-l border-neutral-200/60 dark:border-neutral-800/80 pl-4">
            <span
              class="w-2 h-2 rounded-full"
              :class="activeProfile ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-red-400'"
            ></span>
            <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {{ activeProfile ? t('tray.statusConnected', activeProfile.name) : t('common.disconnected') }}
            </span>
          </div>
        </div>
      </header>

      <!-- 主要內容區 -->
      <div 
        class="flex-1 min-w-0 p-6 overflow-y-auto"
        :class="(currentTab === 'upload' || currentTab === 'history') ? 'md:h-full md:flex md:flex-col md:min-h-0' : ''"
      >
        <!-- 上傳分頁 -->
        <div v-if="currentTab === 'upload'" class="md:flex-1 md:flex md:flex-col md:min-h-0">
          <UploadPanel />
        </div>

        <!-- 歷史紀錄分頁 -->
        <div v-else-if="currentTab === 'history'" class="md:flex-1 md:flex md:flex-col md:min-h-0">
          <HistoryList />
        </div>

        <!-- Profile 分頁 -->
        <div v-else-if="currentTab === 'profiles'">
          <AuthManager />
        </div>

        <!-- 設定分頁 -->
        <div v-else-if="currentTab === 'settings'">
          <SettingsPanel />
        </div>
      </div>
    </div>

    <!-- Toast 提示區 -->
    <div class="fixed bottom-6 right-6 z-60 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all duration-300"
        >
          <CheckCircle v-if="toast.type === 'success'" class="w-4 h-4 text-emerald-500 shrink-0" />
          <XCircle v-else-if="toast.type === 'error'" class="w-4 h-4 text-red-500 shrink-0" />
          <Info v-else class="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>

    <!-- 新手引導 / 操作說明彈窗 -->
    <Transition name="modal">
      <div 
        v-if="showHelpModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 dark:bg-neutral-950/60 backdrop-blur-md"
        @click.self="showHelpModal = false"
      >
        <!-- 彈窗主體 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden transform transition-all select-none">
          
          <!-- 彈窗頂部 (Title + Tabs) -->
          <div class="px-6 pt-5 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60 shrink-0 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <HelpCircle class="w-4 h-4" />
              </div>
              <h2 class="text-sm font-bold text-neutral-800 dark:text-white">{{ t('help.title') }}</h2>
            </div>
            
            <button 
              @click="showHelpModal = false"
              class="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- 分頁切換器 -->
          <div class="px-6 py-2 bg-neutral-50/50 dark:bg-neutral-800/10 border-b border-neutral-100 dark:border-neutral-800/40 shrink-0 flex gap-1.5">
            <button
              @click="activeHelpTab = 'intro'"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              :class="activeHelpTab === 'intro' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40'"
            >
              {{ t('help.tabIntro') }}
            </button>
            <button
              @click="activeHelpTab = 'flow'"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              :class="activeHelpTab === 'flow' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40'"
            >
              {{ t('help.tabFlow') }}
            </button>
            <button
              @click="activeHelpTab = 'details'"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              :class="activeHelpTab === 'details' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40'"
            >
              {{ t('help.tabDetails') }}
            </button>
          </div>

          <!-- 彈窗內容區 -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed select-text">
            
            <!-- Tab 1: 簡介與聲明 -->
            <div v-if="activeHelpTab === 'intro'" class="space-y-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 flex items-center justify-center shrink-0">
                  <img src="/logo.png" alt="DropTus Logo" class="w-full h-full object-contain rounded-xl" />
                </div>
                <div>
                  <h3 class="font-extrabold text-sm text-neutral-800 dark:text-white flex items-center gap-1.5">
                    {{ t('help.intro.welcome') }}
                    <Sparkles class="w-4 h-4 text-indigo-500 shrink-0" />
                  </h3>
                  <p class="text-[10px] text-neutral-400">{{ t('help.intro.subtitle') }}</p>
                </div>
              </div>
              
              <p class="text-neutral-500 dark:text-neutral-400">
                {{ t('help.intro.desc') }}
              </p>

              <div class="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/15 dark:border-emerald-500/10 space-y-1.5">
                <h4 class="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Shield class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {{ t('help.intro.privacyTitle') }}
                </h4>
                <p class="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  {{ t('help.intro.privacyDesc') }}
                </p>
              </div>

              <div class="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/15 dark:border-amber-500/10 space-y-1.5">
                <h4 class="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {{ t('help.intro.disclaimerTitle') }}
                </h4>
                <p class="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  {{ t('help.intro.disclaimerDesc') }}
                </p>
              </div>

              <!-- 贊助支持與更新區塊 (不搶眼但自然融合) -->
              <div class="pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex flex-col sm:flex-row items-stretch justify-between gap-4">
                <!-- 贊助支持卡片 -->
                <div class="flex-1 p-4 bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl border border-rose-500/15 dark:border-rose-500/10 flex flex-col gap-3">
                  <div class="space-y-1">
                    <h4 class="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Heart class="w-3.5 h-3.5 text-rose-500 shrink-0 fill-rose-500/10" />
                      {{ t('common.sponsor.title') }}
                    </h4>
                    <p class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                      {{ t('common.sponsor.desc') }}
                    </p>
                  </div>
                  
                  <div>
                    <button 
                      @click="openExternalUrl('https://www.buymeacoffee.com/junyou')"
                      class="inline-block hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <img 
                        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" 
                        alt="Buy Me A Coffee" 
                        class="h-10 w-auto rounded-lg shadow-sm border border-amber-300/40"
                      />
                    </button>
                  </div>
                </div>

                <!-- 版本資訊與手動更新檢查 -->
                <div class="w-full sm:w-48 p-4 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/15 dark:border-indigo-500/10 flex flex-col justify-between gap-3">
                  <div class="space-y-1">
                    <h4 class="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkles class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {{ t('common.update.changelog') }}
                    </h4>
                    <div class="text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>{{ t('help.intro.welcome') }} v{{ appVersion }}</span>
                    </div>
                  </div>

                  <div>
                    <button
                      @click="checkUpdate(true)"
                      :disabled="isCheckingUpdate"
                      class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm shadow-indigo-600/10 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span v-if="isCheckingUpdate" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{{ isCheckingUpdate ? t('common.update.checking') : t('common.update.check') }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab 2: 新手引導流程 -->
            <div v-else-if="activeHelpTab === 'flow'" class="space-y-5">
              <h3 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                <Layers class="w-4 h-4 text-indigo-500 shrink-0" />
                {{ t('help.flow.title') }}
              </h3>
              
              <!-- 步驟流程圖 -->
              <div class="space-y-4 relative pl-4 border-l border-neutral-100 dark:border-neutral-800/80 ml-3">
                
                <!-- 步驟 1 -->
                <div class="relative">
                  <span class="absolute -left-6.75 top-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm shadow-indigo-600/15">1</span>
                  <div class="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200/50 dark:border-neutral-850 rounded-2xl p-3.5 space-y-1.5">
                    <h4 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                      {{ t('help.flow.step1') }}
                      <Link2 class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </h4>
                    <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {{ t('help.flow.step1Desc') }}
                    </p>
                  </div>
                </div>

                <!-- 步驟 2 -->
                <div class="relative">
                  <span class="absolute -left-6.75 top-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm shadow-indigo-600/15">2</span>
                  <div class="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200/50 dark:border-neutral-850 rounded-2xl p-3.5 space-y-1.5">
                    <h4 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                      {{ t('help.flow.step2') }}
                      <Settings class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </h4>
                    <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {{ t('help.flow.step2Desc') }}
                    </p>
                  </div>
                </div>

                <!-- 步驟 3 -->
                <div class="relative">
                  <span class="absolute -left-6.75 top-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm shadow-indigo-600/15">3</span>
                  <div class="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200/50 dark:border-neutral-850 rounded-2xl p-3.5 space-y-1.5">
                    <h4 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                      {{ t('help.flow.step3') }}
                      <Upload class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </h4>
                    <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {{ t('help.flow.step3Desc') }}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <!-- Tab 3: 進階功能指南 -->
            <div v-else-if="activeHelpTab === 'details'" class="space-y-4">
              <h3 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-indigo-500 shrink-0" />
                {{ t('help.details.title') }}
              </h3>
              
              <div class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                <!-- 功能 1 -->
                <div class="py-3.5 space-y-1">
                  <h4 class="font-bold text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                    <FileCheck2 class="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    {{ t('help.details.md5Title') }}
                  </h4>
                  <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {{ t('help.details.md5Desc') }}
                  </p>
                </div>

                <!-- 功能 2 -->
                <div class="py-3.5 space-y-1">
                  <h4 class="font-bold text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                    <Globe class="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    {{ t('help.details.pathTitle') }}
                  </h4>
                  <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {{ t('help.details.pathDesc') }}
                  </p>
                </div>

                <!-- 功能 3 -->
                <div class="py-3.5 space-y-1">
                  <h4 class="font-bold text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                    <GitMerge class="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    {{ t('help.details.relationTitle') }}
                  </h4>
                  <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {{ t('help.details.relationDesc') }}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Transition>

    <!-- 版本更新提示彈窗 -->
    <Transition name="modal">
      <div 
        v-if="showUpdateModal" 
        class="fixed inset-0 z-55 flex items-center justify-center p-4 bg-neutral-950/40 dark:bg-neutral-950/60 backdrop-blur-md"
        @click.self="showUpdateModal = false"
      >
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden transform transition-all select-none animate-fade-in">
          
          <!-- 頂部與標題 -->
          <div class="px-6 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <Sparkles class="w-4 h-4" />
              </div>
              <h2 class="text-sm font-bold text-neutral-800 dark:text-white">
                {{ t('common.update.newAvailable') }}
              </h2>
            </div>
            <button 
              @click="showUpdateModal = false"
              class="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- 內容：新版本說明與 Changelog -->
          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between text-xs font-semibold bg-neutral-50 dark:bg-neutral-800/30 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-850">
              <div class="text-neutral-500">{{ t('help.intro.welcome') }}</div>
              <div class="flex items-center gap-1.5">
                <span class="text-neutral-455 text-neutral-400 line-through">v{{ appVersion }}</span>
                <span class="text-neutral-400">→</span>
                <span class="px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md font-bold">
                  {{ latestVersion }}
                </span>
              </div>
            </div>

            <div class="space-y-1.5">
              <h4 class="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <Info class="w-3.5 h-3.5 text-indigo-500" />
                {{ t('common.update.changelog') }}
              </h4>
              <div class="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl max-h-[30vh] overflow-y-auto text-xs font-sans whitespace-pre-wrap leading-relaxed select-text border border-neutral-100 dark:border-neutral-850 text-neutral-600 dark:text-neutral-300">
                {{ changelogText || 'No changelog details provided.' }}
              </div>
            </div>
          </div>

          <!-- 底部按鈕 -->
          <div class="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-end gap-2 shrink-0">
            <button
              @click="showUpdateModal = false"
              class="px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              {{ t('common.update.later') }}
            </button>
            <button
              @click="openExternalUrl('https://github.com/junyou1998/DropTus/releases')"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm shadow-indigo-600/10 transition-all flex items-center gap-1.5"
            >
              <span>{{ t('common.update.download') }}</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Help Modal 動畫效果 */
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}
</style>