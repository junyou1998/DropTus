<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { appState, saveAppState, refreshFolders } from "../services/store";
import { Plus, Trash, ToggleLeft, ToggleRight, ChevronDown, ArrowLeft, Check } from "lucide-vue-next";



// 自訂 Select 選單狀態
const isOpenLinkFormat = ref(false);
const isOpenFolder = ref(false);
const openFieldTypes = ref<Record<number, boolean>>({});
const openFieldValues = ref<Record<number, boolean>>({});

function toggleFieldType(idx: number) {
  const current = !!openFieldTypes.value[idx];
  openFieldTypes.value = {};
  openFieldValues.value = {};
  openFieldTypes.value[idx] = !current;
  isOpenLinkFormat.value = false;
  isOpenFolder.value = false;
}

function toggleFieldValue(idx: number) {
  const current = !!openFieldValues.value[idx];
  openFieldTypes.value = {};
  openFieldValues.value = {};
  openFieldValues.value[idx] = !current;
  isOpenLinkFormat.value = false;
  isOpenFolder.value = false;
}

function selectFieldType(idx: number, type: string) {
  dynamicFields.value[idx].type = type;
  openFieldTypes.value[idx] = false;
  dynamicFields.value[idx].value = "";
}

function selectFieldValue(idx: number, value: string) {
  dynamicFields.value[idx].value = value;
  openFieldValues.value[idx] = false;
}

function selectLinkFormat(val: any) {
  linkFormat.value = val;
  isOpenLinkFormat.value = false;
}

function selectFolder(id: string | null) {
  folderId.value = id;
  isOpenFolder.value = false;
}

async function toggleFolderDropdown() {
  isOpenFolder.value = !isOpenFolder.value;
  isOpenLinkFormat.value = false;
  if (isOpenFolder.value) {
    try {
      await refreshFolders();
    } catch (e) {
      console.warn("即時更新資料夾清單失敗:", e);
    }
  }
}

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".link-format-select-container")) {
    isOpenLinkFormat.value = false;
  }
  if (!target.closest(".folder-select-container")) {
    isOpenFolder.value = false;
  }
  if (!target.closest(".field-type-select-container")) {
    openFieldTypes.value = {};
  }
  if (!target.closest(".field-value-select-container")) {
    openFieldValues.value = {};
  }
}

onMounted(() => {
  window.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener("click", handleOutsideClick);
});


// 正在編輯的模板 ID，若為 'new' 則為新增
const editingTemplateId = ref<string | null>(null);

// 表單暫存狀態
const templateName = ref("");
// standard 屬性
const folderId = ref<string | null>(null);
const renamePattern = ref("");
const checkDuplicate = ref(true);
const collectionName = ref("");
const fileFieldName = ref("");
const dynamicFields = ref<Array<{ name: string; type: string; label: string; value: string; options?: string[]; optionsRaw?: string }>>([]);
const linkFormat = ref<"url" | "markdown" | "html" | "custom">("url");
const customPattern = ref("");
const useS3Url = ref(false);
const s3UrlPrefix = ref("");

function openEdit(id: string | "new") {
  if (id === "new") {
    editingTemplateId.value = "new";
    templateName.value = "";
    folderId.value = null;
    renamePattern.value = "";
    checkDuplicate.value = true;
    collectionName.value = "";
    fileFieldName.value = "";
    dynamicFields.value = [];
    linkFormat.value = "url";
    customPattern.value = "";
    useS3Url.value = false;
    s3UrlPrefix.value = "";
  } else {
    const t = appState.templates.find((x) => x.id === id);
    if (!t) return;
    editingTemplateId.value = id;
    templateName.value = t.name;
    folderId.value = t.folderId;
    renamePattern.value = t.renamePattern;
    checkDuplicate.value = t.checkDuplicate;
    collectionName.value = t.collectionName;
    fileFieldName.value = t.fileFieldName;
    
    // 初始化 optionsRaw
    dynamicFields.value = JSON.parse(JSON.stringify(t.dynamicFields || [])).map((f: any) => ({
      ...f,
      optionsRaw: f.options ? f.options.join(", ") : ""
    }));
    
    linkFormat.value = t.linkFormat;
    customPattern.value = t.customPattern;
    useS3Url.value = t.useS3Url || false;
    s3UrlPrefix.value = t.s3UrlPrefix || "";
  }
}

async function handleSaveTemplate() {
  if (!templateName.value) return;

  const tData = {
    id: editingTemplateId.value === "new" ? Date.now().toString() : editingTemplateId.value!,
    name: templateName.value,
    folderId: folderId.value,
    renamePattern: renamePattern.value,
    checkDuplicate: checkDuplicate.value,
    collectionName: collectionName.value,
    fileFieldName: fileFieldName.value,
    dynamicFields: dynamicFields.value.map(f => {
      const field: any = {
        name: f.name,
        type: f.type || "text",
        label: f.label,
        value: f.value
      };
      if (f.type === "select") {
        field.options = f.optionsRaw ? f.optionsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
      }
      return field;
    }),
    linkFormat: linkFormat.value,
    customPattern: customPattern.value,
    useS3Url: useS3Url.value,
    s3UrlPrefix: s3UrlPrefix.value,
  };

  if (editingTemplateId.value === "new") {
    appState.templates.push(tData);
    appState.activeTemplateId = tData.id;
  } else {
    const index = appState.templates.findIndex((x) => x.id === editingTemplateId.value);
    if (index >= 0) {
      appState.templates[index] = tData;
    }
  }

  await saveAppState();
  editingTemplateId.value = null;
}

async function deleteTemplate(id: string) {
  appState.templates = appState.templates.filter((t) => t.id !== id);
  if (appState.activeTemplateId === id) {
    appState.activeTemplateId = appState.templates[0]?.id || null;
  }
  await saveAppState();
}


function addDynamicField() {
  dynamicFields.value.push({ name: "", type: "text", label: "", value: "", options: [], optionsRaw: "" });
}

function removeDynamicField(idx: number) {
  dynamicFields.value.splice(idx, 1);
}
</script>

<template>
  <div class="w-full min-h-125">
    <!-- 列表頁面 -->
    <div v-if="editingTemplateId === null" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-neutral-800 dark:text-white">上傳模板清單</h2>
        <button
          @click="openEdit('new')"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium cursor-pointer shadow-sm shadow-indigo-600/10"
        >
          <Plus class="w-3.5 h-3.5" />
          新增模板
        </button>
      </div>

      <div v-if="appState.templates.length === 0" class="text-center py-10 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-400 text-sm">
        目前沒有設定任何模板，請點擊右上方按鈕新增
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="t in appState.templates"
          :key="t.id"
          class="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-neutral-800 dark:text-white text-base">{{ t.name }}</span>
            </div>
            <p class="text-xs text-neutral-400 truncate mb-4">
              目標資料夾：{{ appState.folders.find(f => f.id === t.folderId)?.name || '根目錄' }}
            </p>
          </div>

          <div class="flex gap-2 justify-end pt-3 border-t border-neutral-100 dark:border-neutral-700/40">
            <button
              @click="openEdit(t.id)"
              class="px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg cursor-pointer"
            >
              編輯
            </button>
            <button
              @click="deleteTemplate(t.id)"
              class="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <Trash class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 編輯/新增頁面 -->
    <div v-else class="w-full min-h-145 bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between space-y-6">
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-700/40 mb-6">
            <button
              type="button"
              @click="editingTemplateId = null"
              class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-all cursor-pointer"
              title="返回模板清單"
            >
              <ArrowLeft class="w-4.5 h-4.5" />
            </button>
            <h2 class="text-lg font-bold text-neutral-800 dark:text-white">
              {{ editingTemplateId === "new" ? "新增上傳模板" : "編輯上傳模板" }}
            </h2>
          </div>

          <div class="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
            <!-- 模板名稱 -->
            <div>
              <label class="block text-xs font-semibold text-neutral-500 mb-1">模板名稱</label>
              <input
                type="text"
                v-model="templateName"
                placeholder="例如：書籍封面"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white"
              />
            </div>


            <!-- 複製格式 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="link-format-select-container">
                <label class="block text-xs font-semibold text-neutral-500 mb-1">複製連結格式</label>
                <div class="relative">
                  <button
                    type="button"
                    @click.stop="isOpenLinkFormat = !isOpenLinkFormat; isOpenFolder = false;"
                    class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <span>
                      {{
                        linkFormat === 'url' ? '僅 Raw URL' :
                        linkFormat === 'markdown' ? 'Markdown (![alt](url))' :
                        linkFormat === 'html' ? 'HTML (<img />)' : '自訂樣板'
                      }}
                    </span>
                    <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': isOpenLinkFormat }" />
                  </button>
                  
                  <div
                    v-if="isOpenLinkFormat"
                    class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <div
                      v-for="opt in [
                        { val: 'url', label: '僅 Raw URL' },
                        { val: 'markdown', label: 'Markdown (![alt](url))' },
                        { val: 'html', label: 'HTML (<img />)' },
                        { val: 'custom', label: '自訂樣板' }
                      ]"
                      :key="opt.val"
                      @click="selectLinkFormat(opt.val)"
                      class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                      :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': linkFormat === opt.val }"
                    >
                      <span>{{ opt.label }}</span>
                      <Check v-if="linkFormat === opt.val" class="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="linkFormat === 'custom'">
                <label class="block text-xs font-semibold text-neutral-500 mb-1">自訂連結樣板 (可用 {url}, {filename})</label>
                <input
                  type="text"
                  v-model="customPattern"
                  placeholder="例如：url={url}&size=large"
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck="false"
                  class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <!-- 標準模式專用欄位 -->
            <div class="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-700/40">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- 目標資料夾 -->
                <div class="folder-select-container">
                  <label class="block text-xs font-semibold text-neutral-500 mb-1">目標儲存資料夾 (Folders)</label>
                  <div class="relative">
                    <button
                      type="button"
                      @click.stop="toggleFolderDropdown"
                      class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <span class="truncate">{{ appState.folders.find(f => f.id === folderId)?.name || '根目錄 (無資料夾)' }}</span>
                      <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': isOpenFolder }" />
                    </button>
                    
                    <div
                      v-if="isOpenFolder"
                      class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-sm text-neutral-700 dark:text-neutral-300"
                    >
                      <div
                        @click="selectFolder(null)"
                        class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                        :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': folderId === null }"
                      >
                        <span>根目錄 (無資料夾)</span>
                        <Check v-if="folderId === null" class="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div
                        v-for="f in appState.folders"
                        :key="f.id"
                        @click="selectFolder(f.id)"
                        class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                        :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': folderId === f.id }"
                      >
                        <span class="truncate mr-2">{{ f.name }}</span>
                        <Check v-if="folderId === f.id" class="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                    </div>
                  </div>
                  <p class="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1.5 leading-relaxed">
                    ※ 資料夾是由當前連線的 Directus 伺服器自動同步。若選單內沒有選項，請先在 Directus 後台建立資料夾，並確保頂部 Header 連線狀態正常。
                  </p>
                </div>

                <!-- 命名樣板 -->
                <div>
                  <label class="block text-xs font-semibold text-neutral-500 mb-1">重命名規則 (如 {y}-{m}-{filename}-{rand:4})</label>
                  <input
                    type="text"
                    v-model="renamePattern"
                    placeholder="留空則保持原檔名"
                    autocapitalize="none"
                    autocorrect="off"
                    spellcheck="false"
                    class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <!-- 進階上傳設定 -->
              <div class="p-4 bg-neutral-50/50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200/85 dark:border-neutral-700/80 space-y-4">
                <!-- MD5 防重比對 -->
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="checkDuplicate = !checkDuplicate"
                    class="text-indigo-600 focus:outline-none cursor-pointer"
                  >
                    <ToggleRight v-if="checkDuplicate" class="w-10 h-6" />
                    <ToggleLeft v-else class="w-10 h-6 text-neutral-400" />
                  </button>
                  <div class="text-xs">
                    <div class="font-semibold text-neutral-800 dark:text-neutral-200">啟用 MD5 防重複上傳</div>
                    <div class="text-neutral-400">上傳前先依據檔案雜湊進行查詢，若伺服器已存在同檔案則直接複製舊連結。</div>
                  </div>
                </div>

                <hr class="border-neutral-200/60 dark:border-neutral-700/40" />

                <!-- S3 CDN 直連網址改寫 -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      @click="useS3Url = !useS3Url"
                      class="text-indigo-600 focus:outline-none cursor-pointer"
                    >
                      <ToggleRight v-if="useS3Url" class="w-10 h-6" />
                      <ToggleLeft v-else class="w-10 h-6 text-neutral-400" />
                    </button>
                    <div class="text-xs">
                      <div class="font-semibold text-neutral-800 dark:text-neutral-200">啟用 S3 CDN 直連網址改寫</div>
                      <div class="text-neutral-400">將 Directus 預設網址替換為您的 S3 直連或 CDN 自訂域名。</div>
                    </div>
                  </div>

                  <div v-if="useS3Url" class="pl-12 space-y-1.5 transition-all">
                    <label class="block text-xs font-semibold text-neutral-500">S3 直連網址前綴 (CDN Base URL)</label>
                    <input
                      type="url"
                      v-model="s3UrlPrefix"
                      placeholder="例如：http://bucket.example.com"
                      autocapitalize="none"
                      autocorrect="off"
                      spellcheck="false"
                      class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                    />
                    <p class="text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
                      ※ 啟用後，最終產生的網址將會被重寫為：`前綴/實際檔名(filename_disk)`（例如：`http://bucket.example.com/35b2f1ec-50cb-4e62-804d-4faa789763be.jpg`）。
                    </p>
                  </div>
                </div>
              </div>

              <!-- 雙步嵌套關聯 Collection 設定 -->
              <div class="p-4 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 space-y-4">
                <div class="font-bold text-xs text-neutral-600 dark:text-neutral-400">雙步 Collection 關聯設定 (可選)</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-neutral-500 mb-1">目標 Collection 名稱</label>
                    <input
                      type="text"
                      v-model="collectionName"
                      placeholder="例如：articles"
                      autocapitalize="none"
                      autocorrect="off"
                      spellcheck="false"
                      class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-neutral-500 mb-1">檔案關聯欄位名稱</label>
                    <input
                      type="text"
                      v-model="fileFieldName"
                      placeholder="例如：cover_image"
                      autocapitalize="none"
                      autocorrect="off"
                      spellcheck="false"
                      class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <!-- 檔案動態欄位配置 -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold text-neutral-500">動態關聯欄位清單</span>
                    <button
                      type="button"
                      @click="addDynamicField"
                      class="text-[10px] text-indigo-600 font-medium cursor-pointer hover:text-indigo-500 transition-all"
                    >
                      + 新增欄位
                    </button>
                  </div>

                  <div class="space-y-4">
                    <div 
                      v-for="(field, idx) in dynamicFields" 
                      :key="idx" 
                      class="p-4 bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl space-y-3"
                    >
                      <!-- 欄位卡片 Header (解決刪除按鈕推擠與排版問題) -->
                      <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-800/60 pb-2 mb-1">
                        <div class="flex items-center gap-2">
                          <span class="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                            {{ idx + 1 }}
                          </span>
                          <span class="text-xs font-bold text-neutral-600 dark:text-neutral-300">關聯欄位設定</span>
                        </div>
                        <button
                          type="button"
                          @click="removeDynamicField(idx)"
                          class="px-2.5 py-1 text-xs text-red-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-650 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all border border-red-500/20"
                          title="移除此欄位"
                        >
                          <Trash class="w-3.5 h-3.5" />
                          <span>移除欄位</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">欄位 API 名稱 (如 status)</label>
                          <input
                            type="text"
                            v-model="field.name"
                            placeholder="欄位名稱"
                            autocapitalize="none"
                            autocorrect="off"
                            spellcheck="false"
                            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                          />
                        </div>

                        <div>
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">顯示標籤 (如 狀態)</label>
                          <input
                            type="text"
                            v-model="field.label"
                            placeholder="顯示名稱"
                            autocapitalize="none"
                            autocorrect="off"
                            spellcheck="false"
                            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                          />
                        </div>

                        <div class="relative field-type-select-container">
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">輸入類型</label>
                          <button
                            type="button"
                            @click.stop="toggleFieldType(idx)"
                            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                          >
                            <span class="truncate">{{ field.type === 'select' ? '下拉選單 (Select)' : '純文字 (Text)' }}</span>
                            <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': openFieldTypes[idx] }" />
                          </button>
                          
                          <div
                            v-if="openFieldTypes[idx]"
                            class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-xs text-neutral-700 dark:text-neutral-300"
                          >
                            <div
                              @click="selectFieldType(idx, 'text')"
                              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': field.type !== 'select' }"
                            >
                              <span>純文字 (Text)</span>
                              <Check v-if="field.type !== 'select'" class="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <div
                              @click="selectFieldType(idx, 'select')"
                              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': field.type === 'select' }"
                            >
                              <span>下拉選單 (Select)</span>
                              <Check v-if="field.type === 'select'" class="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- 針對不同類型顯示不同的進階設定 -->
                      <div class="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
                        <!-- 當類型為 select 時，需要輸入可選的選項清單 -->
                        <div v-if="field.type === 'select'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">選項清單 (以英文逗號分隔，如: draft, published)</label>
                            <input
                              type="text"
                              v-model="field.optionsRaw"
                              placeholder="選項1, 選項2, 選項3"
                              autocapitalize="none"
                              autocorrect="off"
                              spellcheck="false"
                              class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                            />
                          </div>
                          <div class="relative field-value-select-container">
                            <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">預設選擇項</label>
                            <button
                              type="button"
                              @click.stop="toggleFieldValue(idx)"
                              class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                            >
                              <span class="truncate">{{ field.value || '無預設值' }}</span>
                              <ChevronDown class="w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1" :class="{ 'rotate-180': openFieldValues[idx] }" />
                            </button>
                            
                            <div
                              v-if="openFieldValues[idx]"
                              class="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 text-xs text-neutral-700 dark:text-neutral-300"
                            >
                              <div
                                @click="selectFieldValue(idx, '')"
                                class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                                :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': !field.value }"
                              >
                                <span>無預設值</span>
                                <Check v-if="!field.value" class="w-3.5 h-3.5 text-indigo-500" />
                              </div>
                              <div
                                v-for="opt in (field.optionsRaw ? field.optionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [])"
                                :key="opt"
                                @click="selectFieldValue(idx, opt)"
                                class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                                :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': field.value === opt }"
                              >
                                <span class="truncate mr-2">{{ opt }}</span>
                                <Check v-if="field.value === opt" class="w-3.5 h-3.5 text-indigo-500" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- 當類型為 text 時，只需要輸入預設文字值 -->
                        <div v-else>
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">預設填入值</label>
                          <input
                            type="text"
                            v-model="field.value"
                            placeholder="預設填入值 (選填)"
                            autocapitalize="none"
                            autocorrect="off"
                            spellcheck="false"
                            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div> <!-- 這裡關閉 239 (space-y-4) -->
        </div> <!-- 這裡關閉 224 (標頭/表單頂部包裹器 div) -->

          <!-- 保存按鈕 -->
          <div class="pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-700/40">
            <button
              @click="handleSaveTemplate"
              class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
            >
              儲存模板
            </button>
          </div>
        </div> <!-- 這裡關閉 flex-1 flex flex-col 的 div -->
      </div> <!-- 這裡關閉 編輯/新增頁面 w-full 的 div -->
    </div> <!-- 這裡關閉 最外層 w-full min-h-[500px] 的 div -->
</template>
