<script setup lang="ts">
import { onMounted, ref } from "vue";
import { initApp, activeProfile, appState, saveAppState, toasts } from "./services/store";
import { getCurrentWindow } from "@tauri-apps/api/window";
import AuthManager from "./components/AuthManager.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import UploadPanel from "./components/UploadPanel.vue";
import HistoryList from "./components/HistoryList.vue";
import TrayPanel from "./components/TrayPanel.vue";
import { Upload, Settings, Database, Sun, Moon, Monitor, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Info, HelpCircle, X, Shield, AlertTriangle, Sparkles, Link2, Layers, FileCheck2, Globe, GitMerge } from "lucide-vue-next";
import { version as appVersion } from "../package.json";

const currentTab = ref<"upload" | "history" | "profiles" | "settings">("upload");
const isTrayWindow = ref(false);

onMounted(async () => {
  await initApp();
  try {
    const win = getCurrentWindow();
    isTrayWindow.value = win.label === "tray";
  } catch (e) {
    isTrayWindow.value = false;
  }
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
        <!-- 新手說明按鈕 -->
        <button
          @click="showHelpModal = true"
          class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center animate-fade-in"
          title="使用說明與引導手冊"
        >
          <HelpCircle class="w-4 h-4" />
        </button>

        <!-- 主題切換按鈕 -->
        <button
          @click="toggleTheme"
          class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
          :title="
            appState.theme === 'light' ? '目前為淺色模式，點擊切換為深色模式' :
            appState.theme === 'dark' ? '目前為深色模式，點擊切換為跟隨系統' :
            '目前為跟隨系統，點擊切換為淺色模式'
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
            {{ activeProfile ? activeProfile.name : '未連線' }}
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
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold animate-fade-in"
            :class="[
              currentTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            title="上傳工作區"
          >
            <Upload class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">上傳作業</span>
          </button>

          <button
            @click="currentTab = 'history'"
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold animate-fade-in"
            :class="[
              currentTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            title="歷史紀錄"
          >
            <Clock class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">歷史紀錄</span>
          </button>

          <button
            @click="currentTab = 'profiles'"
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold animate-fade-in"
            :class="[
              currentTab === 'profiles'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            title="伺服器 Profile"
          >
            <Database class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">伺服器 Profile</span>
          </button>

          <button
            @click="currentTab = 'settings'"
            class="flex items-center justify-center transition-all cursor-pointer whitespace-nowrap text-xs md:text-sm font-semibold animate-fade-in"
            :class="[
              currentTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40',
              appState.sidebarCollapsed 
                ? 'md:w-10 md:h-10 md:rounded-xl md:p-0 md:justify-center px-3 py-1.5 rounded-xl' 
                : 'md:w-full md:px-4 md:py-3 md:rounded-2xl md:justify-start gap-2.5 px-3 py-2 rounded-2xl'
            ]"
            title="模板設定"
          >
            <Settings class="w-4 h-4 shrink-0" />
            <span :class="['hidden sm:inline', appState.sidebarCollapsed ? 'md:hidden' : 'md:inline']">模板設定</span>
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
          :title="appState.sidebarCollapsed ? '展開側邊欄' : '收合側邊欄'"
        >
          <ChevronRight v-if="appState.sidebarCollapsed" class="w-4 h-4 shrink-0" />
          <ChevronLeft v-else class="w-4 h-4 shrink-0" />
          <span v-if="!appState.sidebarCollapsed" class="whitespace-nowrap">收合側欄</span>
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
          <!-- 新手說明按鈕 -->
          <button
            @click="showHelpModal = true"
            class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center animate-fade-in"
            title="使用說明與引導手冊"
          >
            <HelpCircle class="w-4 h-4" />
          </button>

          <!-- 主題切換按鈕 -->
          <button
            @click="toggleTheme"
            class="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            :title="
              appState.theme === 'light' ? '目前為淺色模式，點擊切換為深色模式' :
              appState.theme === 'dark' ? '目前為深色模式，點擊切換為跟隨系統' :
              '目前為跟隨系統，點擊切換為淺色模式'
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
              {{ activeProfile ? `連線至：${activeProfile.name}` : '未連線' }}
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
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
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
              <h2 class="text-sm font-bold text-neutral-800 dark:text-white">DropTus 新手指南與宣告</h2>
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
              簡介與聲明
            </button>
            <button
              @click="activeHelpTab = 'flow'"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              :class="activeHelpTab === 'flow' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40'"
            >
              新手引導流程
            </button>
            <button
              @click="activeHelpTab = 'details'"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              :class="activeHelpTab === 'details' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40'"
            >
              進階功能指南
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
                    歡迎使用 DropTus
                    <Sparkles class="w-4 h-4 text-indigo-500 shrink-0" />
                  </h3>
                  <p class="text-[10px] text-neutral-400">專為 Directus 設計的極簡檔案上傳工具</p>
                </div>
              </div>
              
              <p class="text-neutral-500 dark:text-neutral-400">
                DropTus 是一套專門用來簡化「Directus 檔案上傳」與「資料庫 Collection 關聯」的獨立輔助工具。您可以透過簡單的拖放，立即將您的截圖、相片或文件上傳至指定的 Directus 伺服器，並視需求自動在目標資料表中新增關聯資料，自動產生格式化好的 Markdown、HTML 或原始網址連結並寫入剪貼簿，方便您直接貼入寫作工具或編輯器中。
              </p>

              <div class="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/15 dark:border-emerald-500/10 space-y-1.5">
                <h4 class="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Shield class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  安全與隱私保障
                </h4>
                <p class="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  您的 Directus 登入憑證、伺服器網址以及所有上傳模板資料，<strong>100% 僅儲存於您本機的 settings.json 設定檔中</strong>。本應用程式沒有任何中轉雲端伺服器，所有的 API 請求皆由您本機直接發送到您指定的 Directus 伺服器，安全且私密。
                </p>
              </div>

              <div class="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/15 dark:border-amber-500/10 space-y-1.5">
                <h4 class="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  非官方獨立工具聲明
                </h4>
                <p class="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  本軟體為第三方獨立開發之社群輔助工具，並非由 Directus 官方（Monospace Ltd）直接提供、維護或背書。
                </p>
              </div>
            </div>

            <!-- Tab 2: 新手引導流程 -->
            <div v-else-if="activeHelpTab === 'flow'" class="space-y-5">
              <h3 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                <Layers class="w-4 h-4 text-indigo-500 shrink-0" />
                簡單三步驟，快速上手
              </h3>
              
              <!-- 步驟流程圖 -->
              <div class="space-y-4 relative pl-4 border-l border-neutral-100 dark:border-neutral-800/80 ml-3">
                
                <!-- 步驟 1 -->
                <div class="relative">
                  <span class="absolute -left-[27px] top-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm shadow-indigo-600/15">1</span>
                  <div class="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200/50 dark:border-neutral-850 rounded-2xl p-3.5 space-y-1.5">
                    <h4 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                      設定伺服器連線 Profile
                      <Link2 class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </h4>
                    <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                      點擊側邊欄的「<strong>伺服器 Profile</strong>」分頁，輸入您的 Directus 伺服器網址與帳密進行登入。系統會安全地儲存登入快取，並在背景自動刷新憑證（Token Refresh），維持連線可用性。
                    </p>
                  </div>
                </div>

                <!-- 步驟 2 -->
                <div class="relative">
                  <span class="absolute -left-[27px] top-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm shadow-indigo-600/15">2</span>
                  <div class="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200/50 dark:border-neutral-850 rounded-2xl p-3.5 space-y-1.5">
                    <h4 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                      建立您的上傳模板
                      <Settings class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </h4>
                    <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                      點擊側邊欄的「<strong>系統模板設定</strong>」，新增一個模板。在此您可以設定：上傳到的 Directus 資料夾、自訂檔案重命名規則（支援隨機數、UUID 等）、防重複上傳檢測，以及最重要的「<strong>雙步 Collection 關聯</strong>」（上傳完後自動把檔案 ID 寫入到特定資料表中，並可設定動態的額外欄位）。
                    </p>
                  </div>
                </div>

                <!-- 步驟 3 -->
                <div class="relative">
                  <span class="absolute -left-[27px] top-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm shadow-indigo-600/15">3</span>
                  <div class="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200/50 dark:border-neutral-850 rounded-2xl p-3.5 space-y-1.5">
                    <h4 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                      拖放檔案，自動複製
                      <Upload class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </h4>
                    <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                      回到「<strong>上傳工作區</strong>」，選定您的 Profile 與上傳模板，直接將您的圖片或檔案拖曳到上傳框中。上傳成功後，系統會自動在剪貼簿中寫入您所選定格式（Raw URL、Markdown、HTML 等）的超連結！
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <!-- Tab 3: 進階功能指南 -->
            <div v-else-if="activeHelpTab === 'details'" class="space-y-4">
              <h3 class="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-indigo-500 shrink-0" />
                進階核心功能解密
              </h3>
              
              <div class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                <!-- 功能 1 -->
                <div class="py-3.5 space-y-1">
                  <h4 class="font-bold text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                    <FileCheck2 class="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    MD5 防重複上傳
                  </h4>
                  <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                    啟用後，DropTus 會在上傳前計算檔案的 MD5 值並向伺服器查詢。若該檔案已存在，會直接使用舊檔連結，<strong>省去重複上傳相同檔案的流量與伺服器儲存空間</strong>。
                  </p>
                </div>

                <!-- 功能 2 -->
                <div class="py-3.5 space-y-1">
                  <h4 class="font-bold text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                    <Globe class="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    S3 CDN 直連網址改寫
                  </h4>
                  <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                    若您的 Directus 儲存端點配置了 AWS S3 或自訂 CDN。您可以設定一個 CDN 前綴，DropTus 產生的連結就會直接改寫為指向該 CDN 位址，<strong>繞過 Directus 後端代理直接獲取資源</strong>，提升載入速度。
                  </p>
                </div>

                <!-- 功能 3 -->
                <div class="py-3.5 space-y-1">
                  <h4 class="font-bold text-neutral-800 dark:text-neutral-200 text-xs flex items-center gap-2">
                    <GitMerge class="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    雙步 Collection 關聯與動態欄位
                  </h4>
                  <p class="text-[11px] text-neutral-400 dark:text-neutral-500">
                    這能在上傳檔案（第一步）的同時，於您指定的 Collection 中新增一筆紀錄（第二步），並將檔案關聯寫入。例如上傳一張相片，在 `photos` 表中新增一筆 `file_id` 為該相片的紀錄，同時讓您在拖放上傳前，動態輸入該筆資料的 `title` 或 `description`！
                  </p>
                </div>
              </div>
            </div>

          </div>

          <!-- 彈窗底部 -->
          <div class="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800/60 shrink-0 flex justify-end">
            <button
              @click="showHelpModal = false"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm shadow-indigo-600/10 transition-all"
            >
              我知道了
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