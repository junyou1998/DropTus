<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { history, deleteHistoryItem, activeTemplate, showToast } from "../services/store";
import { formatLink, copyToClipboard } from "../services/uploader";
import { Copy, Trash2, ExternalLink, FileText, Check, Image, LayoutGrid, LayoutList, ChevronDown } from "lucide-vue-next";

const viewMode = ref<"list" | "grid">("list");
const localLinkFormat = ref<"url" | "markdown" | "html" | "custom">("url");
const localCustomPattern = ref("");
const isOpenFormat = ref(false);

const copiedId = ref<string | null>(null);

// 初始化格式
watch(
  activeTemplate,
  (newVal) => {
    if (newVal) {
      localLinkFormat.value = newVal.linkFormat || "url";
      localCustomPattern.value = newVal.customPattern || "";
    }
  },
  { immediate: true }
);

async function handleCopy(item: any) {
  try {
    const text = formatLink(item.url, item.name, localLinkFormat.value, localCustomPattern.value);
    await copyToClipboard(text);
    copiedId.value = item.id;
    setTimeout(() => {
      copiedId.value = null;
    }, 1500);

    showToast("已成功複製連結至剪貼簿！", "success");
  } catch (err: any) {
    console.error("複製歷史紀錄連結失敗：", err);
    showToast("複製連結失敗，請手動複製！", "error");
  }
}

function isImage(mimeType: string): boolean {
  return mimeType ? mimeType.startsWith("image/") : false;
}

// 格式化檔案大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// 格式化時間
function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  } catch (e) {
    return isoStr;
  }
}

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".history-format-select-container")) {
    isOpenFormat.value = false;
  }
}

onMounted(() => {
  window.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener("click", handleOutsideClick);
});
</script>

<template>
  <div class="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm flex flex-col gap-6 md:flex-1 md:min-h-0">
    <!-- 頂部標題與工具列 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 pb-4 border-b border-neutral-100 dark:border-neutral-700/60">
      <div>
        <h2 class="text-xl font-bold text-neutral-800 dark:text-white">上傳歷史紀錄</h2>
        <span class="text-xs text-neutral-400 font-medium">共計 {{ history.length }} 筆</span>
      </div>

      <!-- 工具列 -->
      <div class="flex items-center gap-3 self-end sm:self-auto select-none">
        <!-- 連結格式選擇 -->
        <div class="relative history-format-select-container">
          <button
            type="button"
            @click.stop="isOpenFormat = !isOpenFormat"
            class="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 focus:outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <span>
              格式：
              {{ 
                localLinkFormat === 'url' ? '僅網址' :
                localLinkFormat === 'markdown' ? 'Markdown' :
                localLinkFormat === 'html' ? 'HTML' : '自訂'
              }}
            </span>
            <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform" :class="{ 'rotate-180': isOpenFormat }" />
          </button>
          
          <div
            v-if="isOpenFormat"
            class="absolute z-50 right-0 mt-1 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <div
              v-for="opt in [
                { val: 'url', label: '僅網址 (Raw URL)' },
                { val: 'markdown', label: 'Markdown' },
                { val: 'html', label: 'HTML' },
                { val: 'custom', label: '自訂樣板' }
              ]"
              :key="opt.val"
              @click="localLinkFormat = opt.val as any; isOpenFormat = false;"
              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': localLinkFormat === opt.val }"
            >
              <span>{{ opt.label }}</span>
              <Check v-if="localLinkFormat === opt.val" class="w-3 h-3 text-indigo-500" />
            </div>
          </div>
        </div>

        <!-- 視圖切換 -->
        <div class="bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-xl flex items-center border border-neutral-200/40 dark:border-neutral-800">
          <button
            @click="viewMode = 'list'"
            class="p-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center"
            :class="viewMode === 'list' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'"
            title="列表視圖"
          >
            <LayoutList class="w-3.5 h-3.5" />
          </button>
          <button
            @click="viewMode = 'grid'"
            class="p-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center"
            :class="viewMode === 'grid' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'"
            title="網格視圖"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- 當選擇自訂樣板時，額外展開輸入框 -->
    <div v-if="localLinkFormat === 'custom'" class="-mt-4 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl shrink-0">
      <label class="block text-[10px] font-bold text-neutral-500 mb-1">自訂複製樣板 (可用 {url}, {filename})</label>
      <input
        type="text"
        v-model="localCustomPattern"
        placeholder="例如：url={url}&size=large"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
        class="w-full px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
      />
    </div>

    <!-- 內容展示區 -->
    <div v-if="history.length === 0" class="text-center py-12 text-neutral-400 text-sm">
      目前沒有任何上傳歷史紀錄
    </div>

    <!-- 列表視圖 -->
    <div v-else-if="viewMode === 'list'" class="divide-y divide-neutral-100 dark:divide-neutral-700/40 pr-1 md:flex-1 md:overflow-y-auto">
      <div v-for="item in history" :key="item.id" class="py-3.5 flex items-center justify-between gap-4">
        <!-- 縮圖與資訊 -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-700 overflow-hidden flex items-center justify-center shrink-0">
            <!-- 圖片縮圖 -->
            <img
              v-if="isImage(item.mimeType) && item.url"
              :src="`${item.url}?width=80&height=80&fit=cover`"
              alt="preview"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <Image v-else-if="isImage(item.mimeType)" class="w-5 h-5 text-neutral-400" />
            <FileText v-else class="w-5 h-5 text-neutral-400" />
          </div>

          <div class="min-w-0 text-xs">
            <div
              class="font-semibold text-neutral-800 dark:text-white truncate max-w-xs md:max-w-md"
              :class="item.status === 'failed' ? 'text-red-500 line-through' : ''"
              :title="item.name"
            >
              {{ item.name }}
            </div>
            <div class="flex items-center gap-2 text-neutral-400 mt-0.5 font-medium">
              <span>{{ formatBytes(item.size) }}</span>
              <span>•</span>
              <span>{{ formatTime(item.time) }}</span>
              <span
                v-if="item.status === 'failed'"
                class="px-1 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded text-[9px]"
              >
                失敗
              </span>
            </div>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- 複製連結 -->
          <button
            v-if="item.status === 'success'"
            @click="handleCopy(item)"
            class="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all cursor-pointer"
            :title="copiedId === item.id ? '已複製！' : '複製連結'"
          >
            <Check v-if="copiedId === item.id" class="w-4 h-4 text-emerald-500" />
            <Copy v-else class="w-4 h-4" />
          </button>

          <!-- 瀏覽器開啟 -->
          <a
            v-if="item.status === 'success' && item.url"
            :href="item.url"
            target="_blank"
            class="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all cursor-pointer"
            title="在瀏覽器開啟"
          >
            <ExternalLink class="w-4 h-4" />
          </a>

          <!-- 刪除紀錄 -->
          <button
            @click="deleteHistoryItem(item.id)"
            class="p-2 text-neutral-400 hover:text-red-500 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all cursor-pointer"
            title="刪除歷史紀錄"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 網格視圖 -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pr-1 md:flex-1 md:overflow-y-auto content-start">
      <div 
        v-for="item in history" 
        :key="item.id" 
        class="relative group aspect-square rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800 overflow-hidden flex flex-col justify-center items-center transition-all hover:scale-[1.02] hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700"
      >
        <!-- 圖片縮圖 -->
        <img
          v-if="isImage(item.mimeType) && item.url"
          :src="`${item.url}?width=200&height=200&fit=cover`"
          alt="thumbnail"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <!-- 檔案圖示 -->
        <div v-else class="flex flex-col items-center gap-2 p-3 text-center w-full">
          <div class="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500">
            <FileText class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 truncate w-full px-2 text-center" :title="item.name">
            {{ item.name }}
          </span>
        </div>

        <!-- 失敗標籤 -->
        <div 
          v-if="item.status === 'failed'" 
          class="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white rounded text-[8px] font-bold"
        >
          失敗
        </div>

        <!-- 懸停操作遮罩 -->
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <!-- 複製按鈕 -->
          <button
            v-if="item.status === 'success'"
            @click="handleCopy(item)"
            class="w-8 h-8 rounded-full bg-white text-neutral-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center shadow-md transition-all scale-90 group-hover:scale-100 duration-200 cursor-pointer"
            :title="copiedId === item.id ? '已複製！' : '複製連結'"
          >
            <Check v-if="copiedId === item.id" class="w-3.5 h-3.5 text-emerald-500" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>

          <!-- 瀏覽器開啟 -->
          <a
            v-if="item.status === 'success' && item.url"
            :href="item.url"
            target="_blank"
            class="w-8 h-8 rounded-full bg-white text-neutral-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center shadow-md transition-all scale-90 group-hover:scale-100 duration-200 cursor-pointer"
            title="在瀏覽器開啟"
          >
            <ExternalLink class="w-3.5 h-3.5" />
          </a>

          <!-- 刪除紀錄 -->
          <button
            @click="deleteHistoryItem(item.id)"
            class="w-8 h-8 rounded-full bg-white text-neutral-800 hover:bg-red-600 hover:text-white flex items-center justify-center shadow-md transition-all scale-90 group-hover:scale-100 duration-200 cursor-pointer"
            title="刪除紀錄"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- 圖片檔名漸變條 -->
        <div 
          v-if="isImage(item.mimeType)"
          class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity"
        >
          <p class="text-[9px] truncate font-medium">{{ item.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
