<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { initApp, activeProfile, activeTemplate, history, deleteHistoryItem, addHistoryItem } from "../services/store";
import { uploadToDirectus, associateCollection } from "../services/directus";
import { formatLink, copyToClipboard } from "../services/uploader";
import { t } from "../services/i18n";
import { UploadCloud, Copy, RefreshCw, Trash2, FileText, Check, Pin, X } from "lucide-vue-next";
import { getCurrentWindow } from "@tauri-apps/api/window";

const isDragging = ref(false);
const copiedId = ref<string | null>(null);
const appWindow = getCurrentWindow();
const isPinned = ref(true); // 預設釘住，更方便拖曳檔案
let unlistenFocus: (() => void) | null = null;

function hidePanel() {
  appWindow.hide();
}

// 監聽釘選狀態，動態與視窗置頂狀態連動
watch(isPinned, async (pinned) => {
  try {
    await appWindow.setAlwaysOnTop(pinned);
  } catch (e) {
    console.warn("無法動態設定視窗置頂狀態：", e);
  }
}, { immediate: true });

onMounted(async () => {
  await initApp();
  
  // 監聽失焦自動隱藏
  try {
    unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused && !isPinned.value) {
        appWindow.hide();
      }
    });
  } catch (e) {
    console.warn("無法監聽視窗聚焦狀態：", e);
  }
});

onUnmounted(() => {
  if (unlistenFocus) {
    unlistenFocus();
  }
});

const currentUpload = ref<{
  name: string;
  progress: number;
  status: "idle" | "uploading" | "success" | "failed";
  error?: string;
}>({
  name: "",
  progress: 0,
  status: "idle",
});

const recentHistory = computed(() => history.value.slice(0, 5));

function triggerFileSelect() {
  if (currentUpload.value.status === "uploading") return;

  const input = document.createElement("input");
  input.type = "file";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      startUpload(file);
    }
  };
  input.click();
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  if (currentUpload.value.status === "uploading") return;

  const file = e.dataTransfer?.files?.[0];
  if (file) {
    startUpload(file);
  }
}

async function startUpload(file: File) {
  if (!activeProfile.value) {
    alert(t("upload.errorNoProfile"));
    return;
  }
  if (!activeTemplate.value) {
    alert(t("upload.errorNoTemplate"));
    return;
  }

  currentUpload.value = {
    name: file.name,
    progress: 10,
    status: "uploading",
  };

  try {
    const template = activeTemplate.value!;
    let result: { id: string; name: string; url: string; filename_disk?: string; isDuplicate?: boolean };

    result = await uploadToDirectus(
      file,
      template.folderId,
      template.renamePattern,
      template.checkDuplicate,
      (p) => {
        currentUpload.value.progress = Math.max(10, p - 5);
      }
    );

    // S3 網址改寫
    if (template.useS3Url && template.s3UrlPrefix && result.filename_disk) {
      const prefix = template.s3UrlPrefix.replace(/\/+$/, "");
      result.url = `${prefix}/${result.filename_disk}`;
    }

    if (template.collectionName && template.fileFieldName) {
      const fields = (template.dynamicFields || []).map((f) => ({
        name: f.name,
        value: f.value,
      }));
      await associateCollection(result.id, template.collectionName, template.fileFieldName, fields, !!result.isDuplicate);
    }

    currentUpload.value.status = "success";
    currentUpload.value.progress = 100;

    try {
      const formatted = formatLink(result.url, result.name, template.linkFormat, template.customPattern);
      await copyToClipboard(formatted);
    } catch (clipErr: any) {
      console.warn("自動複製至剪貼簿失敗：", clipErr);
    }

    await addHistoryItem({
      id: result.id,
      name: result.name,
      size: file.size,
      url: result.url,
      thumbnailUrl: file.type.startsWith("image/") ? result.url : "",
      time: new Date().toISOString(),
      status: "success",
      mimeType: file.type,
    });
  } catch (err: any) {
    currentUpload.value.status = "failed";
    currentUpload.value.error = err.message || t("common.failed");

    await addHistoryItem({
      id: `err-${Date.now()}`,
      name: file.name,
      size: file.size,
      url: "",
      thumbnailUrl: "",
      time: new Date().toISOString(),
      status: "failed",
      mimeType: file.type,
    });
  }
}

async function handleCopy(item: any) {
  const format = activeTemplate.value?.linkFormat || "url";
  const customPattern = activeTemplate.value?.customPattern;
  const text = formatLink(item.url, item.name, format, customPattern);

  await copyToClipboard(text);
  copiedId.value = item.id;
  setTimeout(() => {
    copiedId.value = null;
  }, 1500);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
</script>

<template>
  <div class="w-full h-screen bg-transparent p-3 flex flex-col select-none">
    <div class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-between rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]">
      <!-- Header -->
      <div 
        data-tauri-drag-region 
        class="flex items-center justify-between pt-4 px-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/60 cursor-grab active:cursor-grabbing select-none shrink-0 -mx-4 -mt-4 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-t-2xl"
      >
        <div data-tauri-drag-region class="pointer-events-none flex items-center gap-2">
          <img src="/logo.png" alt="DropTus Logo" class="w-7 h-7 object-contain rounded-lg select-none" />
          <div data-tauri-drag-region>
            <h2 class="text-xs font-black tracking-wider text-neutral-800 dark:text-white uppercase">
              {{ t("history.searchPlaceholder") === 'Search files...' ? 'Quick Upload' : '快速上傳面板' }}
            </h2>
            <p class="text-[9px] text-neutral-400 font-medium">
              {{ activeProfile ? activeProfile.name : t("common.disconnected") }} • {{ activeTemplate ? activeTemplate.name : t("upload.errorNoTemplate") }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-1.5">
          <!-- 圖釘鎖定按鈕 -->
          <button
            @click="isPinned = !isPinned"
            class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            :class="isPinned ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 hover:text-neutral-600'"
            :title="t('tray.alwaysOnTop')"
          >
            <Pin class="w-3 h-3" />
          </button>
          
          <!-- 縮小/隱藏按鈕 -->
          <button
            @click="hidePanel"
            class="p-1 text-neutral-400 hover:text-red-500 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- 拖放與進度區 -->
      <div class="flex-1 my-3 flex flex-col justify-center gap-3">
        <!-- 拖放區 -->
        <div
          v-if="currentUpload.status !== 'uploading'"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          @click="triggerFileSelect"
          class="flex-1 border border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all"
          :class="
            isDragging
              ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10'
              : 'border-neutral-200 dark:border-neutral-800/60 hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
          "
        >
          <UploadCloud
            class="w-10 h-10 mb-2 transition-all"
            :class="isDragging ? 'text-indigo-500 scale-110' : 'text-neutral-400'"
          />
          <span class="text-xs font-bold text-neutral-700 dark:text-neutral-200">
            {{ t("tray.dragTip") }}
          </span>
        </div>

        <!-- 上傳進度 -->
        <div
          v-else
          class="flex-1 bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-center items-center gap-2"
        >
          <RefreshCw class="w-8 h-8 text-indigo-500 animate-spin mb-1" />
          <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 truncate max-w-55">
            {{ currentUpload.name }}
          </span>
          <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden max-w-50">
            <div class="bg-indigo-600 h-full rounded-full transition-all duration-300" :style="{ width: `${currentUpload.progress}%` }"></div>
          </div>
          <span class="text-[9px] text-neutral-400 font-bold">{{ currentUpload.progress }}%</span>
        </div>
      </div>

      <!-- 最近歷史紀錄 -->
      <div class="h-44 border-t border-neutral-100 dark:border-neutral-800/60 pt-2 flex flex-col">
        <div class="text-[10px] font-bold text-neutral-400 uppercase mb-2">{{ t("history.title") }}</div>

        <div v-if="recentHistory.length === 0" class="flex-1 flex items-center justify-center text-[10px] text-neutral-400">
          {{ t("common.noData") }}
        </div>

        <div v-else class="flex-1 overflow-y-auto space-y-1.5 pr-0.5 divide-y divide-neutral-100/40 dark:divide-neutral-800">
          <div
            v-for="item in recentHistory"
            :key="item.id"
            class="flex items-center justify-between gap-2 text-[10px] py-1.5 first:pt-0"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  v-if="item.mimeType.startsWith('image/') && item.url"
                  :src="`${item.url}?width=40&height=40&fit=cover`"
                  alt="thumb"
                  class="w-full h-full object-cover"
                />
                <FileText v-else class="w-3.5 h-3.5 text-neutral-400" />
              </div>

              <div class="min-w-0">
                <div
                  class="font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-35"
                  :class="item.status === 'failed' ? 'text-red-500 line-through' : ''"
                >
                  {{ item.name }}
                </div>
                <div class="text-[9px] text-neutral-400">{{ formatBytes(item.size) }}</div>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button
                v-if="item.status === 'success'"
                @click="handleCopy(item)"
                class="p-1 text-neutral-400 hover:text-indigo-500 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <Check v-if="copiedId === item.id" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
              <button
                @click="deleteHistoryItem(item.id)"
                class="p-1 text-neutral-400 hover:text-red-500 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
