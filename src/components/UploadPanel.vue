<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { appState, activeProfile, activeTemplate, saveAppState, addHistoryItem, showToast } from "../services/store";
import { uploadToDirectus, associateCollection } from "../services/directus";
import { formatLink, copyToClipboard } from "../services/uploader";
import { UploadCloud, CheckCircle, XCircle, Copy, RefreshCw, FileText, ChevronDown, Check } from "lucide-vue-next";

const isDragging = ref(false);
const queueScrollContainer = ref<HTMLElement | null>(null);

function scrollToTop() {
  if (queueScrollContainer.value) {
    queueScrollContainer.value.scrollTop = 0;
  }
}

const uploadQueue = ref<Array<{
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "pending" | "uploading" | "success" | "failed";
  error?: string;
  resultUrl?: string;
}>>([]);

const dynamicFieldValues = ref<Record<string, string>>({});

// 動態欄位監聽模板切換
const dynamicFieldsToRender = computed(() => {
  if (!activeTemplate.value) return [];
  const fields = activeTemplate.value.dynamicFields || [];
  // 重設 values
  for (const f of fields) {
    if (dynamicFieldValues.value[f.name] === undefined) {
      dynamicFieldValues.value[f.name] = f.value || "";
    }
  }
  return fields;
});

const isUploading = computed(() => uploadQueue.value.some(item => item.status === "uploading"));



// 自訂 Select 選單狀態與行為
const isOpenProfile = ref(false);
const isOpenTemplate = ref(false);
const isOpenLinkFormat = ref(false);
const openDynamicSelects = ref<Record<string, boolean>>({});

const activeLinkFormat = ref<"url" | "markdown" | "html" | "custom">("url");
const activeCustomPattern = ref("");

watch(
  activeTemplate,
  (newVal) => {
    if (newVal) {
      activeLinkFormat.value = newVal.linkFormat || "url";
      activeCustomPattern.value = newVal.customPattern || "";
    }
  },
  { immediate: true }
);

function toggleDynamicSelect(fieldName: string) {
  isOpenProfile.value = false;
  isOpenTemplate.value = false;
  isOpenLinkFormat.value = false;
  const current = !!openDynamicSelects.value[fieldName];
  openDynamicSelects.value = {};
  openDynamicSelects.value[fieldName] = !current;
}

function selectDynamicValue(fieldName: string, value: string) {
  dynamicFieldValues.value[fieldName] = value;
  openDynamicSelects.value[fieldName] = false;
}

function selectLinkFormat(val: any) {
  activeLinkFormat.value = val;
  isOpenLinkFormat.value = false;
}

async function selectProfile(id: string | null) {
  appState.activeProfileId = id;
  await saveAppState();
}

async function selectTemplate(id: string | null) {
  appState.activeTemplateId = id;
  await saveAppState();
  // 重置動態欄位輸入值
  dynamicFieldValues.value = {};
  openDynamicSelects.value = {};
}

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".profile-select-container")) {
    isOpenProfile.value = false;
  }
  if (!target.closest(".template-select-container")) {
    isOpenTemplate.value = false;
  }
  if (!target.closest(".dynamic-select-container")) {
    openDynamicSelects.value = {};
  }
  if (!target.closest(".link-format-select-container")) {
    isOpenLinkFormat.value = false;
  }
}

onMounted(() => {
  window.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener("click", handleOutsideClick);
});


// 觸發本地檔案選擇
function triggerFileSelect() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files) {
      addFilesToQueue(Array.from(files));
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
  const files = e.dataTransfer?.files;
  if (files) {
    addFilesToQueue(Array.from(files));
  }
}

function addFilesToQueue(files: File[]) {
  if (!activeProfile.value) {
    alert("請先登入或選擇有效的 Profile");
    return;
  }
  if (!activeTemplate.value) {
    alert("請先選擇上傳模板");
    return;
  }

  const newItems = files.map(file => ({
    id: `${Date.now()}-${Math.random()}`,
    name: file.name,
    size: file.size,
    progress: 0,
    status: "pending" as const,
    rawFile: file
  }));
  uploadQueue.value.unshift(...newItems);

  // 開始上傳佇列
  processQueue();

  // 自動置頂
  nextTick(() => {
    scrollToTop();
  });
}

async function processQueue() {
  if (isUploading.value) return;

  const pendingItem = uploadQueue.value.find(item => item.status === "pending") as any;
  if (!pendingItem) return;

  pendingItem.status = "uploading";
  pendingItem.progress = 10;

  try {
    const template = activeTemplate.value!;
    let result: { id: string; name: string; url: string; filename_disk?: string; isDuplicate?: boolean };

    result = await uploadToDirectus(
      pendingItem.rawFile,
      template.folderId,
      template.renamePattern,
      template.checkDuplicate,
      (p) => {
        pendingItem.progress = Math.max(10, p - 5);
      }
    );

    // S3 網址改寫
    if (template.useS3Url && template.s3UrlPrefix && result.filename_disk) {
      const prefix = template.s3UrlPrefix.replace(/\/+$/, "");
      result.url = `${prefix}/${result.filename_disk}`;
    }

    // 如果有雙步關聯 (即使是重複檔案也進行關聯，內部會自動判斷 POST 還是 PATCH 更新)
    if (template.collectionName && template.fileFieldName) {
      const fields = (template.dynamicFields || []).map(f => ({
        name: f.name,
        value: dynamicFieldValues.value[f.name] !== undefined ? dynamicFieldValues.value[f.name] : f.value
      }));
      await associateCollection(result.id, template.collectionName, template.fileFieldName, fields, !!result.isDuplicate);
    }

    pendingItem.status = "success";
    pendingItem.progress = 100;
    pendingItem.resultUrl = result.url;

    // 自動格式化複製至剪貼簿
    try {
      const format = activeLinkFormat.value || template.linkFormat || "url";
      const pattern = activeCustomPattern.value || template.customPattern || "";
      const formatted = formatLink(result.url, result.name, format, pattern);
      await copyToClipboard(formatted);
      showToast(`已自動複製連結：${result.name}`, "success");
    } catch (clipErr: any) {
      console.warn("自動複製至剪貼簿失敗（可能因視窗失焦限制，您可以點擊手動複製）：", clipErr);
      showToast(`上傳成功，但自動複製失敗（請手動複製）`, "info");
    }

    // 加入歷史紀錄
    await addHistoryItem({
      id: result.id,
      name: result.name,
      size: pendingItem.size,
      url: result.url,
      thumbnailUrl: pendingItem.rawFile.type.startsWith("image/") ? result.url : "",
      time: new Date().toISOString(),
      status: "success",
      mimeType: pendingItem.rawFile.type
    });

  } catch (err: any) {
    pendingItem.status = "failed";
    pendingItem.error = err.message || "上傳失敗";

    // 失敗也加入歷史
    await addHistoryItem({
      id: `err-${Date.now()}`,
      name: pendingItem.name,
      size: pendingItem.size,
      url: "",
      thumbnailUrl: "",
      time: new Date().toISOString(),
      status: "failed",
      mimeType: pendingItem.rawFile.type
    });
  }

  // 繼續上傳下一個
  processQueue();
}

const copiedItemIds = ref<Record<string, boolean>>({});

async function copySingleItem(item: { id: string; resultUrl?: string; name: string }) {
  if (!item.resultUrl) return;
  try {
    const template = activeTemplate.value;
    const format = activeLinkFormat.value || template?.linkFormat || "url";
    const pattern = activeCustomPattern.value || template?.customPattern || "";
    const formatted = formatLink(item.resultUrl, item.name, format, pattern);
    await copyToClipboard(formatted);
    
    // 設定複製成功狀態，過 1.5 秒自動回復
    copiedItemIds.value[item.id] = true;
    setTimeout(() => {
      copiedItemIds.value[item.id] = false;
    }, 1500);

    showToast("已成功複製連結至剪貼簿！", "success");
  } catch (err: any) {
    console.error("個別複製連結失敗：", err);
    showToast("複製連結失敗，請手動選取複製！", "error");
  }
}

function clearQueue() {
  uploadQueue.value = [];
}
</script>

<template>
  <div class="flex flex-col gap-6 md:flex-1 md:min-h-0">
    <!-- 下拉控制列 -->
    <!-- 下拉控制列 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm">
      <div class="profile-select-container">
        <label class="block text-xs font-semibold text-neutral-500 mb-1">選擇連線 Profile</label>
        <div class="relative">
          <button
            type="button"
            @click.stop="isOpenProfile = !isOpenProfile; isOpenTemplate = false; isOpenLinkFormat = false; openDynamicSelects = {};"
            class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <span class="truncate">{{ appState.profiles.find(p => p.id === appState.activeProfileId)?.name || '請選擇連線...' }}</span>
            <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': isOpenProfile }" />
          </button>
          
          <div
            v-if="isOpenProfile"
            class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <div
              @click="selectProfile(null); isOpenProfile = false;"
              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': appState.activeProfileId === null }"
            >
              <span>請選擇連線...</span>
              <Check v-if="appState.activeProfileId === null" class="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div
              v-for="p in appState.profiles"
              :key="p.id"
              @click="selectProfile(p.id); isOpenProfile = false;"
              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': p.id === appState.activeProfileId }"
            >
              <span class="truncate mr-2">{{ p.name }}</span>
              <Check v-if="p.id === appState.activeProfileId" class="w-3.5 h-3.5 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      <div class="template-select-container">
        <label class="block text-xs font-semibold text-neutral-500 mb-1">選擇上傳模板</label>
        <div class="relative">
          <button
            type="button"
            @click.stop="isOpenTemplate = !isOpenTemplate; isOpenProfile = false; isOpenLinkFormat = false; openDynamicSelects = {};"
            class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <span class="truncate">{{ appState.templates.find(t => t.id === appState.activeTemplateId)?.name || '請選擇模板...' }}</span>
            <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': isOpenTemplate }" />
          </button>
          
          <div
            v-if="isOpenTemplate"
            class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <div
              @click="selectTemplate(null); isOpenTemplate = false;"
              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': appState.activeTemplateId === null }"
            >
              <span>請選擇模板...</span>
              <Check v-if="appState.activeTemplateId === null" class="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div
              v-for="t in appState.templates"
              :key="t.id"
              @click="selectTemplate(t.id); isOpenTemplate = false;"
              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': t.id === appState.activeTemplateId }"
            >
              <span class="truncate mr-2">{{ t.name }}</span>
              <Check v-if="t.id === appState.activeTemplateId" class="w-3.5 h-3.5 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      <div class="link-format-select-container">
        <label class="block text-xs font-semibold text-neutral-500 mb-1">複製連結格式</label>
        <div class="relative">
          <button
            type="button"
            :disabled="!activeTemplate"
            @click.stop="isOpenLinkFormat = !isOpenLinkFormat; isOpenProfile = false; isOpenTemplate = false; openDynamicSelects = {};"
            class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="truncate">
              {{ 
                !activeTemplate ? '請先選擇模板...' :
                activeLinkFormat === 'url' ? '僅網址 (Raw URL)' :
                activeLinkFormat === 'markdown' ? 'Markdown (![alt](url))' :
                activeLinkFormat === 'html' ? 'HTML (<img />)' : '自訂樣板'
              }}
            </span>
            <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': isOpenLinkFormat }" />
          </button>
          
          <div
            v-if="isOpenLinkFormat && activeTemplate"
            class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <div
              v-for="opt in [
                { val: 'url', label: '僅網址 (Raw URL)' },
                { val: 'markdown', label: 'Markdown (![alt](url))' },
                { val: 'html', label: 'HTML (<img />)' },
                { val: 'custom', label: '自訂樣板' }
              ]"
              :key="opt.val"
              @click="selectLinkFormat(opt.val)"
              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': activeLinkFormat === opt.val }"
            >
              <span>{{ opt.label }}</span>
              <Check v-if="activeLinkFormat === opt.val" class="w-3.5 h-3.5 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- 當選擇自訂樣板時，額外展開輸入框 (跨滿 3 欄) -->
      <div v-if="activeLinkFormat === 'custom' && activeTemplate" class="col-span-1 md:col-span-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
        <label class="block text-xs font-semibold text-neutral-500 mb-1">自訂連結樣板 (可用 {url}, {filename})</label>
        <input
          type="text"
          v-model="activeCustomPattern"
          placeholder="例如：url={url}&size=large"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
        />
      </div>
    </div>

    <!-- 動態關聯欄位輸入區 (如果有設定的話) -->
    <div v-if="dynamicFieldsToRender.length > 0" class="bg-indigo-50/10 dark:bg-neutral-800/40 p-5 rounded-2xl border border-indigo-500/20 dark:border-neutral-700/80 space-y-3">
      <div class="font-bold text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
        <FileText class="w-4 h-4 text-indigo-500" />
        請輸入 Collection 元數據 (Metadata) 欄位內容
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="field in dynamicFieldsToRender" :key="field.name">
          <label class="block text-xs font-semibold text-neutral-500 mb-1">{{ field.label || field.name }}</label>
          
          <!-- 下拉選單模式 -->
          <div v-if="field.type === 'select'" class="relative dynamic-select-container">
            <button
              type="button"
              @click.stop="toggleDynamicSelect(field.name)"
              class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <span class="truncate">{{ dynamicFieldValues[field.name] || '請選擇...' }}</span>
              <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': openDynamicSelects[field.name] }" />
            </button>
            
            <div
              v-if="openDynamicSelects[field.name]"
              class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-xs text-neutral-700 dark:text-neutral-300"
            >
              <div
                @click="selectDynamicValue(field.name, '')"
                class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': !dynamicFieldValues[field.name] }"
              >
                <span>請選擇...</span>
                <Check v-if="!dynamicFieldValues[field.name]" class="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div
                v-for="opt in (field.options || [])"
                :key="opt"
                @click="selectDynamicValue(field.name, opt)"
                class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': dynamicFieldValues[field.name] === opt }"
              >
                <span class="truncate mr-2">{{ opt }}</span>
                <Check v-if="dynamicFieldValues[field.name] === opt" class="w-3.5 h-3.5 text-indigo-500" />
              </div>
            </div>
          </div>
          
          <!-- 純文字模式 -->
          <input
            v-else
            type="text"
            v-model="dynamicFieldValues[field.name]"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>
    </div>

    <!-- 拖放上傳區 -->
    <div
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileSelect"
      class="border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-40 md:flex-1 md:shrink"
      :class="
        isDragging
          ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
          : 'border-neutral-300 dark:border-neutral-700/60 hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
      "
    >
      <UploadCloud
        class="w-14 h-14 mb-4 transition-all"
        :class="isDragging ? 'text-indigo-500 scale-110' : 'text-neutral-400 dark:text-neutral-500'"
      />
      <div class="text-sm font-semibold text-neutral-800 dark:text-white mb-1">
        拖放檔案至此處，或點擊選取檔案上傳
      </div>
      <p class="text-xs text-neutral-400">
        {{ activeTemplate ? `當前模板：${activeTemplate.name}` : '請先選取上傳模板' }}
      </p>
    </div>

    <!-- 上傳佇列列表 -->
    <div v-if="uploadQueue.length > 0" class="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm p-6 flex flex-col gap-4 min-h-35 md:max-h-70 md:flex-1 md:min-h-0 md:shrink">
      <div class="flex items-center justify-between shrink-0">
        <h3 class="font-bold text-neutral-800 dark:text-white text-base">上傳進度</h3>
        <div class="flex gap-2">
          <button
            @click="clearQueue"
            :disabled="isUploading"
            class="px-3 py-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-40 rounded-xl text-xs font-semibold cursor-pointer"
          >
            清除佇列
          </button>
        </div>
      </div>

      <div ref="queueScrollContainer" class="divide-y divide-neutral-100 dark:divide-neutral-700/40 md:flex-1 md:overflow-y-auto pr-1">
        <div v-for="item in uploadQueue" :key="item.id" class="py-3 flex items-center justify-between gap-4 text-xs">
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium text-neutral-800 dark:text-white truncate max-w-sm">{{ item.name }}</span>
              <span class="text-neutral-400 font-medium shrink-0 ml-2">{{ (item.size / 1024).toFixed(1) }} KB</span>
            </div>
            <!-- 進度條 -->
            <div class="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="
                  item.status === 'success'
                    ? 'bg-emerald-500'
                    : item.status === 'failed'
                    ? 'bg-red-500'
                    : 'bg-indigo-600'
                "
                :style="{ width: `${item.progress}%` }"
              ></div>
            </div>
          </div>

          <div class="shrink-0 flex items-center gap-2">
            <RefreshCw v-if="item.status === 'uploading'" class="w-4 h-4 text-indigo-500 animate-spin" />
            <template v-else-if="item.status === 'success'">
              <button
                @click="copySingleItem(item)"
                class="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg cursor-pointer transition-colors flex items-center justify-center"
                :class="copiedItemIds[item.id] ? 'text-emerald-500' : 'text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400'"
                :title="copiedItemIds[item.id] ? '已複製！' : '複製此連結'"
              >
                <Check v-if="copiedItemIds[item.id]" class="w-3.5 h-3.5" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
              <CheckCircle class="w-4 h-4 text-emerald-500" />
            </template>
            <div v-else-if="item.status === 'failed'" class="flex items-center gap-1 text-red-500">
              <XCircle class="w-4 h-4" />
              <span class="text-[10px] max-w-30 truncate" :title="item.error">{{ item.error }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
