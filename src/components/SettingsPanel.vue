<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { appState, saveAppState, refreshFolders } from "../services/store";
import { t } from "../services/i18n";
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
    const tData = appState.templates.find((x) => x.id === id);
    if (!tData) return;
    editingTemplateId.value = id;
    templateName.value = tData.name;
    folderId.value = tData.folderId;
    renamePattern.value = tData.renamePattern;
    checkDuplicate.value = tData.checkDuplicate;
    collectionName.value = tData.collectionName;
    fileFieldName.value = tData.fileFieldName;
    
    dynamicFields.value = JSON.parse(JSON.stringify(tData.dynamicFields || [])).map((f: any) => ({
      ...f,
      optionsRaw: f.options ? f.options.join(", ") : ""
    }));
    
    linkFormat.value = tData.linkFormat;
    customPattern.value = tData.customPattern;
    useS3Url.value = tData.useS3Url || false;
    s3UrlPrefix.value = tData.s3UrlPrefix || "";
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
  if (confirm(t("settings.deleteTemplateConfirm"))) {
    appState.templates = appState.templates.filter((t) => t.id !== id);
    if (appState.activeTemplateId === id) {
      appState.activeTemplateId = appState.templates[0]?.id || null;
    }
    await saveAppState();
  }
}

function addDynamicField() {
  dynamicFields.value.push({ name: "", type: "text", label: "", value: "", options: [], optionsRaw: "" });
}

function removeDynamicField(idx: number) {
  dynamicFields.value.splice(idx, 1);
}
</script>

<template>
  <div class="w-full min-h-[500px]">
    <!-- 列表頁面 -->
    <div v-if="editingTemplateId === null" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-neutral-800 dark:text-white">{{ t("settings.title") }}</h2>
        <button
          @click="openEdit('new')"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium cursor-pointer shadow-sm shadow-indigo-600/10"
        >
          <Plus class="w-3.5 h-3.5" />
          {{ t("settings.addTemplate") }}
        </button>
      </div>

      <div v-if="appState.templates.length === 0" class="text-center py-10 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-400 text-sm">
        {{ t("common.noData") }}
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="tData in appState.templates"
          :key="tData.id"
          class="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-neutral-800 dark:text-white text-base">{{ tData.name }}</span>
            </div>
            <p class="text-xs text-neutral-400 truncate mb-4">
              {{ t("settings.folder") }}：{{ appState.folders.find(f => f.id === tData.folderId)?.name || t("settings.rootFolder") }}
            </p>
          </div>

          <div class="flex gap-2 justify-end pt-3 border-t border-neutral-100 dark:border-neutral-700/40">
            <button
              @click="openEdit(tData.id)"
              class="px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg cursor-pointer"
            >
              {{ t("common.edit") }}
            </button>
            <button
              @click="deleteTemplate(tData.id)"
              class="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <Trash class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 編輯/新增頁面 -->
    <div v-else class="w-full min-h-[500px] bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm flex flex-col justify-between space-y-6">
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-700/40 mb-6">
            <button
              type="button"
              @click="editingTemplateId = null"
              class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-all cursor-pointer"
              title="Back"
            >
              <ArrowLeft class="w-4.5 h-4.5" />
            </button>
            <h2 class="text-lg font-bold text-neutral-800 dark:text-white">
              {{ editingTemplateId === "new" ? t("settings.addTemplate") : t("settings.editTemplate") }}
            </h2>
          </div>

          <div class="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
            <!-- 模板名稱 -->
            <div>
              <label class="block text-xs font-semibold text-neutral-500 mb-1">{{ t("settings.name") }}</label>
              <input
                type="text"
                v-model="templateName"
                placeholder="e.g. Article Cover"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white"
              />
            </div>

            <!-- 複製格式 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="link-format-select-container">
                <label class="block text-xs font-semibold text-neutral-500 mb-1">{{ t("upload.selectFormat") }}</label>
                <div class="relative">
                  <button
                    type="button"
                    @click.stop="isOpenLinkFormat = !isOpenLinkFormat; isOpenFolder = false;"
                    class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <span>
                      {{
                        linkFormat === 'url' ? 'Raw URL' :
                        linkFormat === 'markdown' ? 'Markdown (![alt](url))' :
                        linkFormat === 'html' ? 'HTML (<img />)' : 'Custom Template'
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
                        { val: 'url', label: 'Raw URL' },
                        { val: 'markdown', label: 'Markdown (![alt](url))' },
                        { val: 'html', label: 'HTML (<img />)' },
                        { val: 'custom', label: 'Custom Template' }
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
                <label class="block text-xs font-semibold text-neutral-500 mb-1">Custom Format (use {url}, {filename})</label>
                <input
                  type="text"
                  v-model="customPattern"
                  placeholder="e.g. url={url}&size=large"
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
                  <label class="block text-xs font-semibold text-neutral-500 mb-1">{{ t("settings.folder") }}</label>
                  <div class="relative">
                    <button
                      type="button"
                      @click.stop="toggleFolderDropdown"
                      class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <span class="truncate">{{ appState.folders.find(f => f.id === folderId)?.name || t("settings.rootFolder") }}</span>
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
                        <span>{{ t("settings.rootFolder") }}</span>
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
                </div>

                <!-- 命名樣板 -->
                <div>
                  <label class="block text-xs font-semibold text-neutral-500 mb-1">{{ t("settings.rename") }}</label>
                  <input
                    type="text"
                    v-model="renamePattern"
                    placeholder="e.g. {y}-{m}-{d}-{filename}"
                    autocapitalize="none"
                    autocorrect="off"
                    spellcheck="false"
                    class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-neutral-800 dark:text-white"
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
                    <div class="font-semibold text-neutral-800 dark:text-neutral-200">{{ t("settings.checkDuplicate") }}</div>
                    <div class="text-neutral-400">{{ t("settings.checkDuplicateDesc") }}</div>
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
                      <div class="font-semibold text-neutral-800 dark:text-neutral-200">{{ t("settings.cdnPrefix") }}</div>
                      <div class="text-neutral-400">{{ t("settings.cdnPrefixDesc") }}</div>
                    </div>
                  </div>

                  <div v-if="useS3Url" class="pl-12 space-y-1.5 transition-all">
                    <label class="block text-xs font-semibold text-neutral-500">{{ t("settings.cdnPrefix") }}</label>
                    <input
                      type="url"
                      v-model="s3UrlPrefix"
                      placeholder="e.g. https://cdn.example.com/assets"
                      autocapitalize="none"
                      autocorrect="off"
                      spellcheck="false"
                      class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <!-- 雙步嵌套關聯 Collection 設定 -->
              <div class="p-4 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 space-y-4">
                <div class="font-bold text-xs text-neutral-600 dark:text-neutral-400">{{ t("settings.relation") }}</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-neutral-500 mb-1">{{ t("settings.collectionName") }}</label>
                    <input
                      type="text"
                      v-model="collectionName"
                      placeholder="e.g. articles"
                      autocapitalize="none"
                      autocorrect="off"
                      spellcheck="false"
                      class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-neutral-500 mb-1">{{ t("settings.fileField") }}</label>
                    <input
                      type="text"
                      v-model="fileFieldName"
                      placeholder="e.g. cover_image"
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
                    <span class="text-[10px] font-semibold text-neutral-500">{{ t("settings.dynamicFields") }}</span>
                    <button
                      type="button"
                      @click="addDynamicField"
                      class="text-[10px] text-indigo-600 font-medium cursor-pointer hover:text-indigo-500 transition-all"
                    >
                      + {{ t("settings.addDynamicField") }}
                    </button>
                  </div>

                  <div class="space-y-4">
                    <div 
                      v-for="(field, idx) in dynamicFields" 
                      :key="idx" 
                      class="p-4 bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl space-y-3"
                    >
                      <!-- 欄位卡片 Header -->
                      <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-800/60 pb-2 mb-1">
                        <div class="flex items-center gap-2">
                          <span class="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                            {{ idx + 1 }}
                          </span>
                          <span class="text-xs font-bold text-neutral-600 dark:text-neutral-300">{{ t("settings.dynamicFields") }}</span>
                        </div>
                        <button
                          type="button"
                          @click="removeDynamicField(idx)"
                          class="px-2.5 py-1 text-xs text-red-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-650 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all border border-red-500/20"
                        >
                          <Trash class="w-3.5 h-3.5" />
                          <span>{{ t("common.delete") }}</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">{{ t("settings.fieldName") }}</label>
                          <input
                            type="text"
                            v-model="field.name"
                            placeholder="e.g. status"
                            autocapitalize="none"
                            autocorrect="off"
                            spellcheck="false"
                            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                          />
                        </div>

                        <div>
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">{{ t("settings.fieldLabel") }}</label>
                          <input
                            type="text"
                            v-model="field.label"
                            placeholder="e.g. Status"
                            autocapitalize="none"
                            autocorrect="off"
                            spellcheck="false"
                            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                          />
                        </div>

                        <div class="relative field-type-select-container">
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">{{ t("settings.fieldType") }}</label>
                          <button
                            type="button"
                            @click.stop="toggleFieldType(idx)"
                            class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                          >
                            <span class="truncate">{{ field.type === 'select' ? 'Select' : 'Text' }}</span>
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
                              <span>Text</span>
                              <Check v-if="field.type !== 'select'" class="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <div
                              @click="selectFieldType(idx, 'select')"
                              class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-between"
                              :class="{ 'font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400': field.type === 'select' }"
                            >
                              <span>Select</span>
                              <Check v-if="field.type === 'select'" class="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- 針對不同類型顯示不同的進階設定 -->
                      <div class="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
                        <div v-if="field.type === 'select'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">Option List (comma separated, e.g. draft, published)</label>
                            <input
                              type="text"
                              v-model="field.optionsRaw"
                              placeholder="draft, published, archive"
                              autocapitalize="none"
                              autocorrect="off"
                              spellcheck="false"
                              class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-neutral-800 dark:text-white transition-all"
                            />
                          </div>
                          <div class="relative field-value-select-container">
                            <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">Default Value</label>
                            <button
                              type="button"
                              @click.stop="toggleFieldValue(idx)"
                              class="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                            >
                              <span class="truncate">{{ field.value || 'None' }}</span>
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
                                <span>None</span>
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

                        <div v-else>
                          <label class="block text-[10px] font-semibold text-neutral-450 dark:text-neutral-400 mb-1">{{ t("settings.fieldVal") }}</label>
                          <input
                            type="text"
                            v-model="field.value"
                            placeholder="Optional default value"
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

          </div>
        </div>

        <!-- 保存按鈕 -->
        <div class="pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-700/40">
          <button
            @click="handleSaveTemplate"
            class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
          >
            {{ t("common.save") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
