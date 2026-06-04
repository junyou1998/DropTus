import { ref } from "vue";

// 支援的語系代碼定義
export type LocaleType = "zh-TW" | "zh-CN" | "en" | "ja" | "ko";

// 預設與偵測系統語言的輔助函數
export function detectLocale(): LocaleType {
  const sysLang = navigator.language || "en";
  const lang = sysLang.toLowerCase();
  
  if (lang.includes("zh-tw") || lang.includes("zh-hk") || lang.includes("zh-hant")) {
    return "zh-TW";
  }
  if (lang.includes("zh-cn") || lang.includes("zh-sg") || lang.includes("zh-hans") || lang.startsWith("zh")) {
    return "zh-CN";
  }
  if (lang.includes("ja")) {
    return "ja";
  }
  if (lang.includes("ko")) {
    return "ko";
  }
  return "en";
}

// 當前語言狀態
export const locale = ref<LocaleType>("en");

// 翻譯字典定義
export const translations: Record<LocaleType, Record<string, any>> = {
  "zh-TW": {
    common: {
      save: "儲存設定",
      saving: "儲存中...",
      cancel: "取消",
      delete: "刪除",
      confirm: "確定",
      edit: "編輯",
      add: "新增",
      success: "成功",
      failed: "失敗",
      copied: "已複製到剪貼簿",
      noData: "暫無資料",
      loading: "載入中...",
      disconnected: "未連線",
      theme: {
        light: "淺色模式",
        dark: "深色模式",
        system: "跟隨系統",
        descLight: "目前為淺色模式，點擊切換為深色模式",
        descDark: "目前為深色模式，點擊切換為跟隨系統",
        descSystem: "目前為跟隨系統，點擊切換為淺色模式"
      },
      language: {
        auto: "自動偵測",
        select: "語言設定",
        title: "介面語言"
      }
    },
    sidebar: {
      upload: "上傳作業",
      history: "歷史紀錄",
      profiles: "伺服器 Profile",
      settings: "模板設定",
      collapsed: "收合側邊欄",
      expand: "展開側邊欄",
      help: "使用說明與引導手冊"
    },
    help: {
      title: "DropTus 使用手冊與宣告",
      tabIntro: "簡介與聲明",
      tabFlow: "新手引導流程",
      tabDetails: "進階功能指南",
      intro: {
        welcome: "歡迎使用 DropTus",
        subtitle: "專為 Directus 設計的極簡檔案上傳工具",
        desc: "DropTus 是一套專門用來簡化「Directus 檔案上傳」與「資料庫 Collection 關聯」的獨立輔助工具。您可以透過簡單的拖放，立即將您的截圖、相片或文件上傳至指定的 Directus 伺服器，並視需求自動在目標資料表中新增關聯資料，自動產生格式化好的 Markdown、HTML 或原始網址連結並寫入剪貼簿，方便您直接貼入寫作工具或編輯器中。",
        privacyTitle: "安全與隱私保障",
        privacyDesc: "您的 Directus 登入憑證、伺服器網址以及所有上傳模板資料，100% 僅儲存於您本機的 settings.json 設定檔中。本應用程式沒有任何中轉雲端伺服器，所有的 API 請求皆由您本機直接發送到您指定的 Directus 伺服器，安全且私密。",
        disclaimerTitle: "非官方獨立工具聲明",
        disclaimerDesc: "本軟體為第三方獨立開發之社群輔助工具，並非由 Directus 官方（Monospace Ltd）直接提供、維護或背書。"
      },
      flow: {
        title: "簡單三步驟，快速上手",
        step1: "設定伺服器連線 Profile",
        step1Desc: "點擊側邊欄的「伺服器 Profile」分頁，輸入您的 Directus 伺服器網址與帳密進行登入。系統會安全地儲存登入快取，並在背景自動刷新憑證（Token Refresh），維持連線可用性。",
        step2: "建立您的上傳模板",
        step2Desc: "點擊側邊欄的「系統模板設定」，新增一個模板。在此您可以設定：上傳到的 Directus 資料夾、自訂檔案重命名規則（支援隨機數、UUID 等）、防重複上傳檢測，以及最重要的「雙步 Collection 關聯」（上傳完後自動把檔案 ID 寫入到特定資料表中，並可設定動態的額外欄位）。",
        step3: "拖放檔案，自動複製",
        step3Desc: "回到「上傳工作區」，選定您的 Profile 與上傳模板，直接將您的圖片或檔案拖曳到上傳框中。上傳成功後，系統會自動在剪貼簿中寫入您所選定格式（Raw URL、Markdown、HTML 等）的超連結！"
      },
      details: {
        title: "進階核心功能解密",
        md5Title: "MD5 防重複上傳",
        md5Desc: "啟用後，DropTus 會在上傳前計算檔案的 MD5 值並向伺服器查詢。若該檔案已存在，會直接使用舊檔連結，省去重複上傳相同檔案的流量與伺服器儲存空間。",
        pathTitle: "S3 CDN 直連網址改寫",
        pathDesc: "若您的 Directus 儲存端點配置了 AWS S3 或自訂 CDN。您可以設定一個 CDN 前綴，DropTus 產生的連結就會直接改寫為指向該 CDN 位址，繞過 Directus 後端代理直接獲取資源，提升載入速度。",
        relationTitle: "雙步 Collection 關聯與動態欄位",
        relationDesc: "這能在上傳檔案（第一步）的同時，於您指定的 Collection 中新增一筆紀錄（第二步），並將檔案關聯寫入。例如上傳一張相片，在 photos 表中新增一筆 file_id 為該相片的紀錄，同時讓您在拖放上傳前，動態輸入該筆資料的 title 或 description！"
      }
    },
    auth: {
      title: "伺服器 Profile 管理",
      addProfile: "新增 Profile",
      editProfile: "編輯 Profile",
      name: "Profile 名稱",
      url: "Directus 伺服器網址",
      urlPlaceholder: "例如: https://directus.example.com",
      authMethod: "身份驗證方式",
      methodToken: "靜態 Token (Static Token)",
      methodPassword: "使用者帳號密碼",
      token: "Static Token",
      tokenPlaceholder: "請輸入 Directus 靜態 Token",
      email: "電子郵件",
      emailPlaceholder: "請輸入登入電子郵件",
      password: "密碼",
      passwordPlaceholder: "請輸入密碼",
      statusConnected: "連線成功",
      statusFailed: "連線失敗",
      login: "連線並登入",
      save: "儲存 Profile",
      deleteConfirm: "確定要刪除此 Profile 嗎？",
      activeProfile: "當前使用中",
      useThis: "使用此 Profile",
      tokenExpired: "憑證已過期，請點選以重新登入",
      tokenValid: "連線正常"
    },
    settings: {
      title: "上傳模板設定",
      addTemplate: "新增模板",
      editTemplate: "編輯模板",
      name: "模板名稱",
      folder: "目標儲存資料夾",
      syncFolders: "同步伺服器資料夾",
      rootFolder: "根目錄 (無特定資料夾)",
      rename: "檔名重命名規則",
      renameDesc: "留空則使用原始檔名。支援變數：{y}年、{m}月、{d}日、{h}時、{i}分、{s}秒、{filename}原始檔名、{rand:N}隨機數字、{uuid:N}隨機UUID。例如: {y}{m}{d}-{filename}-{rand:4}",
      checkDuplicate: "啟用 MD5 防重複上傳 (查重)",
      checkDuplicateDesc: "上傳前本地計算 MD5 值，若伺服器已有相同檔案則直接複製舊檔連結以節省流量。",
      cdnPrefix: "CDN 網址改寫前綴",
      cdnPrefixPlaceholder: "例如: https://cdn.example.com/assets",
      cdnPrefixDesc: "留空則預設使用 Directus 原始連結。若後端使用 S3 + CDN 加速，可在此處輸入改寫前綴。",
      relation: "雙步 Collection 資料表關聯",
      enableRelation: "啟用 Collection 連動寫入",
      collectionName: "目標 Collection 名稱",
      collectionNamePlaceholder: "例如: articles",
      fileField: "檔案 ID 寫入欄位",
      fileFieldPlaceholder: "例如: cover_image",
      dynamicFields: "自訂動態欄位設定",
      fieldName: "欄位 Key",
      fieldLabel: "顯示名稱 (Label)",
      fieldType: "欄位型態",
      fieldVal: "預設值 (選填)",
      addDynamicField: "新增動態欄位",
      deleteTemplateConfirm: "確定要刪除此模板嗎？",
      activeTemplate: "當前使用中",
      useThis: "使用此模板"
    },
    upload: {
      title: "檔案上傳工作區",
      dragTip: "將檔案拖放到此處，或點擊選擇檔案上傳",
      uploading: "正在上傳 {0}...",
      errorNoProfile: "請先在側邊欄設定並登入 Directus 伺服器 Profile",
      errorNoTemplate: "請先設定上傳模板",
      selectProfile: "選擇 Profile",
      selectTemplate: "選擇模板",
      selectFormat: "複製連結格式",
      dynamicInputs: "Collection 動態欄位輸入",
      fileInfo: "檔案資訊",
      size: "大小",
      copiedFormat: "已複製成 {0} 格式！",
      uploadSuccessNotify: "上傳成功！連結已複製到剪貼簿",
      uploadFailedNotify: "上傳失敗：{0}"
    },
    history: {
      title: "上傳歷史紀錄",
      searchPlaceholder: "搜尋檔案名稱...",
      clearAll: "清空歷史紀錄",
      clearAllConfirm: "確定要清空所有的上傳歷史紀錄嗎？（本地快取，不影響 Directus 伺服器檔案）",
      copyLink: "複製連結",
      openInBrowser: "瀏覽器開啟",
      copyAllLinks: "複製全部連結"
    },
    tray: {
      dragTip: "拖放檔案至此快速上傳",
      alwaysOnTop: "視窗釘選",
      statusConnected: "已連線：{0}",
      statusDisconnected: "尚未連線 Directus",
      activeTemplate: "目前模板：{0}",
      pleaseLogin: "請先在主程式中完成伺服器 Profile 設定與連線登入。"
    }
  },
  "zh-CN": {
    common: {
      save: "保存设置",
      saving: "保存中...",
      cancel: "取消",
      delete: "删除",
      confirm: "确定",
      edit: "编辑",
      add: "新增",
      success: "成功",
      failed: "失败",
      copied: "已复制到剪贴簿",
      noData: "暂无数据",
      loading: "加载中...",
      disconnected: "未连接",
      theme: {
        light: "浅色模式",
        dark: "深色模式",
        system: "跟随系统",
        descLight: "当前为浅色模式，点击切换为深色模式",
        descDark: "当前为深色模式，点击切换为跟随系统",
        descSystem: "当前为跟随系统，点击切换为浅色模式"
      },
      language: {
        auto: "自动检测",
        select: "语言设置",
        title: "界面语言"
      }
    },
    sidebar: {
      upload: "上传作业",
      history: "历史记录",
      profiles: "服务器 Profile",
      settings: "模板设置",
      collapsed: "折叠侧边栏",
      expand: "展开侧边栏",
      help: "使用说明与引导手册"
    },
    help: {
      title: "DropTus 使用手册与宣告",
      tabIntro: "简介与声明",
      tabFlow: "新手引导流程",
      tabDetails: "进阶功能指南",
      intro: {
        welcome: "欢迎使用 DropTus",
        subtitle: "专为 Directus 设计的极简文件上传工具",
        desc: "DropTus 是一套专门用来简化“Directus 文件上传”与“数据库 Collection 关联”的独立辅助工具。您可以透过简单的拖放，立即将您的截图、相片或文件上传至指定的 Directus 服务器，并视需求自动在目标数据表中新增关联数据，自动产生格式化好的 Markdown、HTML 或原始网址链接并写入剪贴板，方便您直接贴入写作工具或编辑器中。",
        privacyTitle: "安全与隐私保障",
        privacyDesc: "您的 Directus 登录凭证、服务器网址以及所有上传模板数据，100% 仅存储在您本地的 settings.json 配置文件中。本应用没有任何中转云端服务器，所有的 API 请求皆由您本地直接发送到您指定的 Directus 服务器，安全且私密。",
        disclaimerTitle: "非官方独立工具声明",
        disclaimerDesc: "本软件为第三方独立开发之社区辅助工具，并非由 Directus 官方（Monospace Ltd）直接提供、维护或背书。"
      },
      flow: {
        title: "简单三步骤，快速上手",
        step1: "配置服务器连接 Profile",
        step1Desc: "点击侧边栏的“服务器 Profile”分页，输入您的 Directus 服务器网址与帐密进行登录。系统会安全地存储登录缓存，并在背景自动刷新凭证（Token Refresh），维持连接可用性。",
        step2: "建立您的上传模板",
        step2Desc: "点击侧边栏的“系统模板设置”，新增一个模板。在此您可以设置：上传到的 Directus 文件夹、自定义文件重命名规则（支持随机数、UUID 等）、防重复上传检测，以及最重要的“双步 Collection 关联”（上传完后自动把文件 ID 写入到特定数据表中，并可设置动态的额外字段）。",
        step3: "拖放文件，自动复制",
        step3Desc: "回到“上传工作区”，选定您的 Profile 与上传模板，直接将您的图片或文件拖拽到上传框中。上传成功后，系统会自动在剪贴板中写入您所选定格式（Raw URL、Markdown、HTML 等）的超链接！"
      },
      details: {
        title: "进阶核心功能解密",
        md5Title: "MD5 防重复上传",
        md5Desc: "启用后，DropTus 会在上传前计算文件的 MD5 值并向服务器查询。若该文件已存在，会直接使用旧档链接，省去重复上传相同文件的流量与服务器存储空间。",
        pathTitle: "S3 CDN 直连网址改写",
        pathDesc: "若您的 Directus 存储端点配置了 AWS S3 或自定义 CDN。您可以设置一个 CDN 前缀，DropTus 产生的链接就会直接改写为指向该 CDN 地址，绕过 Directus 后端代理直接获取资源，提升加载速度。",
        relationTitle: "双步 Collection 关联与动态字段",
        relationDesc: "这能在上传文件（第一步）的同时，于您指定的 Collection 中新增一笔纪录（第二步），并将文件关联写入。例如上传一张相片，在 photos 表中新增一笔 file_id 为该相片的纪录，同时让您在拖放上传前，动态输入该笔数据的 title 或 description！"
      }
    },
    auth: {
      title: "服务器 Profile 管理",
      addProfile: "新增 Profile",
      editProfile: "编辑 Profile",
      name: "Profile 名称",
      url: "Directus 服务器网址",
      urlPlaceholder: "例如: https://directus.example.com",
      authMethod: "身份验证方式",
      methodToken: "静态 Token (Static Token)",
      methodPassword: "用户账号密码",
      token: "Static Token",
      tokenPlaceholder: "请输入 Directus 静态 Token",
      email: "电子邮件",
      emailPlaceholder: "请输入登录电子邮件",
      password: "密码",
      passwordPlaceholder: "请输入密码",
      statusConnected: "连接成功",
      statusFailed: "连接失败",
      login: "连接并登录",
      save: "保存 Profile",
      deleteConfirm: "确定要删除此 Profile 吗？",
      activeProfile: "当前使用中",
      useThis: "使用此 Profile",
      tokenExpired: "凭证已过期，请点击以重新登录",
      tokenValid: "连接正常"
    },
    settings: {
      title: "上传模板设置",
      addTemplate: "新增模板",
      editTemplate: "编辑模板",
      name: "模板名称",
      folder: "目标存储文件夹",
      syncFolders: "同步服务器文件夹",
      rootFolder: "根目录 (无特定文件夹)",
      rename: "文件名重命名规则",
      renameDesc: "留空则使用原始文件名。支持变量：{y}年、{m}月、{d}日、{h}时、{i}分、{s}秒、{filename}原始文件名、{rand:N}随机数字、{uuid:N}随机UUID。例如: {y}{m}{d}-{filename}-{rand:4}",
      checkDuplicate: "启用 MD5 防重复上传 (查重)",
      checkDuplicateDesc: "上传前本地计算 MD5 值，若服务器已有相同文件则直接复制旧档链接以节省流量。",
      cdnPrefix: "CDN 网址改写前缀",
      cdnPrefixPlaceholder: "例如: https://cdn.example.com/assets",
      cdnPrefixDesc: "留空则默认使用 Directus 原始链接。若后端使用 S3 + CDN 加速，可在此处输入改写前缀。",
      relation: "双步 Collection 数据表关联",
      enableRelation: "启用 Collection 联动写入",
      collectionName: "目标 Collection 名称",
      collectionNamePlaceholder: "例如: articles",
      fileField: "文件 ID 写入字段",
      fileFieldPlaceholder: "例如: cover_image",
      dynamicFields: "自定义动态字段设置",
      fieldName: "字段 Key",
      fieldLabel: "显示名称 (Label)",
      fieldType: "字段类型",
      fieldVal: "默认值 (选填)",
      addDynamicField: "新增动态字段",
      deleteTemplateConfirm: "确定要删除此模板吗？",
      activeTemplate: "当前使用中",
      useThis: "使用此模板"
    },
    upload: {
      title: "文件上传工作区",
      dragTip: "将文件拖放到此处，或点击选择文件上传",
      uploading: "正在上传 {0}...",
      errorNoProfile: "请先在侧边栏设置并登录 Directus 服务器 Profile",
      errorNoTemplate: "请先设置上传模板",
      selectProfile: "选择 Profile",
      selectTemplate: "选择模板",
      selectFormat: "复制链接格式",
      dynamicInputs: "Collection 动态字段输入",
      fileInfo: "文件信息",
      size: "大小",
      copiedFormat: "已复制成 {0} 格式！",
      uploadSuccessNotify: "上传成功！链接已复制到剪贴板",
      uploadFailedNotify: "上传失败：{0}"
    },
    history: {
      title: "上传历史记录",
      searchPlaceholder: "搜索文件名称...",
      clearAll: "清空历史记录",
      clearAllConfirm: "确定要清空所有的上传历史记录吗？（本地缓存，不影响 Directus 服务器文件）",
      copyLink: "复制链接",
      openInBrowser: "浏览器打开",
      copyAllLinks: "复制全部链接"
    },
    tray: {
      dragTip: "拖放文件至此快速上传",
      alwaysOnTop: "窗口固定",
      statusConnected: "已连接：{0}",
      statusDisconnected: "尚未连接 Directus",
      activeTemplate: "当前模板：{0}",
      pleaseLogin: "请先在主程序中完成服务器 Profile 设置与连接登录。"
    }
  },
  "en": {
    common: {
      save: "Save Settings",
      saving: "Saving...",
      cancel: "Cancel",
      delete: "Delete",
      confirm: "Confirm",
      edit: "Edit",
      add: "Add",
      success: "Success",
      failed: "Failed",
      copied: "Copied to clipboard",
      noData: "No Data",
      loading: "Loading...",
      disconnected: "Disconnected",
      theme: {
        light: "Light Mode",
        dark: "Dark Mode",
        system: "System Mode",
        descLight: "Currently in light mode, click to switch to dark mode",
        descDark: "Currently in dark mode, click to switch to system mode",
        descSystem: "Currently in system mode, click to switch to light mode"
      },
      language: {
        auto: "Auto Detect",
        select: "Language Settings",
        title: "Language"
      }
    },
    sidebar: {
      upload: "Upload",
      history: "History",
      profiles: "Profiles",
      settings: "Templates",
      collapsed: "Collapse Sidebar",
      expand: "Expand Sidebar",
      help: "Help & User Guide"
    },
    help: {
      title: "DropTus User Guide & Disclaimer",
      tabIntro: "Intro & Disclaimer",
      tabFlow: "User Onboarding",
      tabDetails: "Advanced Guide",
      intro: {
        welcome: "Welcome to DropTus",
        subtitle: "A lightweight file upload helper for Directus",
        desc: "DropTus is an independent helper tool designed to simplify 'Directus File Uploads' and 'Database Collection Associations'. Drag and drop images, screenshots, or files to upload them to Directus and auto-generate clean URLs (Raw URL, Markdown, or HTML) directly to your clipboard for quick paste operations.",
        privacyTitle: "Security & Privacy Guarantee",
        privacyDesc: "Credentials (Email, Password, Tokens), server URLs, and templates are 100% saved locally on your computer in your settings.json file. No cloud servers are used. All API requests go directly from your local machine to your Directus server.",
        disclaimerTitle: "Unofficial Helper Tool Disclaimer",
        disclaimerDesc: "This software is an independent third-party community tool and is not officially provided, maintained, or endorsed by Directus (Monospace Ltd)."
      },
      flow: {
        title: "Get Started in 3 Easy Steps",
        step1: "Configure Server Profile",
        step1Desc: "Go to 'Profiles' tab, type your Directus URL and credentials, or directly fill in a Static Token to establish a connection. Session tokens are automatically refreshed in the background.",
        step2: "Create Upload Template",
        step2Desc: "Under 'Templates' tab, add a new template configuration. Here you can set the target folder, custom renaming patterns (supporting timestamp, UUID, etc.), MD5 duplicate prevention checks, and Double-step Collection Linkages.",
        step3: "Drag, Drop & Autocopy",
        step3Desc: "Navigate to the 'Upload' tab, select your profile and template configuration, and drag your files. The formatted URL is automatically copied to your clipboard on success."
      },
      details: {
        title: "Advanced Core Features Explained",
        md5Title: "MD5 Duplicate Prevention",
        md5Desc: "When enabled, DropTus calculates the MD5 hash locally before uploading. If a duplicate file exists, it links directly to the old asset, saving server space and network bandwidth.",
        pathTitle: "S3 CDN Direct URL Rewrite",
        pathDesc: "If using AWS S3 or a custom CDN setup on Directus, configure a CDN base prefix. The final returned links will automatically be rewritten to bypass your backend proxy, delivering resources faster.",
        relationTitle: "Double-step Collection Linkage",
        relationDesc: "Enables creating a new database record in a separate Collection (step 2) immediately after file uploading (step 1). Link the uploaded file ID to specific fields and input custom metadata values dynamically in the UI before dropping."
      }
    },
    auth: {
      title: "Directus Profiles",
      addProfile: "Add Profile",
      editProfile: "Edit Profile",
      name: "Profile Name",
      url: "Directus Server URL",
      urlPlaceholder: "e.g., https://directus.example.com",
      authMethod: "Authentication Method",
      methodToken: "Static Token",
      methodPassword: "Username & Password",
      token: "Static Token",
      tokenPlaceholder: "Enter your Directus Static Token",
      email: "Email",
      emailPlaceholder: "Enter login email address",
      password: "Password",
      passwordPlaceholder: "Enter login password",
      statusConnected: "Connected",
      statusFailed: "Connection Failed",
      login: "Connect & Login",
      save: "Save Profile",
      deleteConfirm: "Are you sure you want to delete this profile?",
      activeProfile: "Active Profile",
      useThis: "Use This Profile",
      tokenExpired: "Session expired. Click to log in again.",
      tokenValid: "Connected"
    },
    settings: {
      title: "Upload Templates",
      addTemplate: "Add Template",
      editTemplate: "Edit Template",
      name: "Template Name",
      folder: "Target Folder",
      syncFolders: "Sync Server Folders",
      rootFolder: "Root Directory",
      rename: "File Renaming Pattern",
      renameDesc: "Leave empty for original filename. Supported tags: {y} year, {m} month, {d} day, {h} hour, {i} min, {s} sec, {filename} original name, {rand:N} random numbers, {uuid:N} random UUID. e.g., {y}{m}{d}-{filename}-{rand:4}",
      checkDuplicate: "Enable MD5 Duplicate Check",
      checkDuplicateDesc: "Calculates file MD5. If already exists on server, reuses it to save space.",
      cdnPrefix: "CDN URL Prefix",
      cdnPrefixPlaceholder: "e.g., https://cdn.example.com/assets",
      cdnPrefixDesc: "Leave empty for raw Directus asset URL. Specify if using S3 + CDN setup.",
      relation: "Double-step Collection Linkage",
      enableRelation: "Enable Collection Auto-Write",
      collectionName: "Target Collection Name",
      collectionNamePlaceholder: "e.g., articles",
      fileField: "File ID Field",
      fileFieldPlaceholder: "e.g., cover_image",
      dynamicFields: "Dynamic Field Configuration",
      fieldName: "Field Key",
      fieldLabel: "Display Label",
      fieldType: "Field Type",
      fieldVal: "Default Value (Optional)",
      addDynamicField: "Add Dynamic Field",
      deleteTemplateConfirm: "Are you sure you want to delete this template?",
      activeTemplate: "Active Template",
      useThis: "Use This Template"
    },
    upload: {
      title: "Upload Workspace",
      dragTip: "Drag and drop files here, or click to choose",
      uploading: "Uploading {0}...",
      errorNoProfile: "Please configure and connect a Directus Profile first.",
      errorNoTemplate: "Please set up an upload template first.",
      selectProfile: "Profile",
      selectTemplate: "Template",
      selectFormat: "Link Format",
      dynamicInputs: "Collection Dynamic Fields",
      fileInfo: "File Info",
      size: "Size",
      copiedFormat: "Copied as {0}!",
      uploadSuccessNotify: "Uploaded successfully! Link copied to clipboard",
      uploadFailedNotify: "Upload failed: {0}"
    },
    history: {
      title: "Upload History",
      searchPlaceholder: "Search files...",
      clearAll: "Clear History",
      clearAllConfirm: "Are you sure you want to clear history? (Local cache only, server files remain)",
      copyLink: "Copy Link",
      openInBrowser: "Open in Browser",
      copyAllLinks: "Copy All Links"
    },
    tray: {
      dragTip: "Drop files here to upload",
      alwaysOnTop: "Pin Panel",
      statusConnected: "Connected: {0}",
      statusDisconnected: "Disconnected from Directus",
      activeTemplate: "Template: {0}",
      pleaseLogin: "Please configure and log in to a Profile in the main app."
    }
  },
  "ja": {
    common: {
      save: "設定を保存",
      saving: "保存中...",
      cancel: "キャンセル",
      delete: "削除",
      confirm: "確定",
      edit: "編集",
      add: "追加",
      success: "成功",
      failed: "失敗",
      copied: "クリップボードにコピーしました",
      noData: "データなし",
      loading: "読み込み中...",
      disconnected: "未接続",
      theme: {
        light: "ライトモード",
        dark: "ダークモード",
        system: "システム設定に従う",
        descLight: "現在ライトモードです。クリックでダークモードに切り替えます",
        descDark: "現在ダークモードです。クリックでシステムモードに切り替えます",
        descSystem: "現在システム設定モードです。クリックでライトモードに切り替えます"
      },
      language: {
        auto: "自動検出",
        select: "言語設定",
        title: "インターフェース言語"
      }
    },
    sidebar: {
      upload: "アップロード",
      history: "履歴",
      profiles: "プロファイル",
      settings: "テンプレート",
      collapsed: "サイドバーを折りたたむ",
      expand: "サイドバーを展開する",
      help: "ヘルプとご利用ガイド"
    },
    help: {
      title: "DropTus ご利用ガイドと宣言",
      tabIntro: "紹介と声明",
      tabFlow: "ユーザーガイド",
      tabDetails: "高度なガイド",
      intro: {
        welcome: "DropTusへようこそ",
        subtitle: "Directus専用の極めてシンプルなアップロード補助ツール",
        desc: "DropTusは、「Directusへのファイルアップロード」と「データベースコレクションの自動連携」を簡略化するために設計された、独立したサードパーティ製の補助ツールです。簡単なドラッグ＆ドロップ操作で画像やスクリーンショットをサーバーにアップロードし、コピー可能なフォーマット済みのリンク（Raw URL、Markdown、またはHTML）をクリップボードに自動生成します。",
        privacyTitle: "安全とプライバシーの保証",
        privacyDesc: "接続情報（メールアドレス、パスワード、トークン）、サーバーURL、テンプレートなどのデータは、100%お使いのPCの settings.json ファイルにのみ保存されます。クラウドサーバーは一切経由せず、すべてのAPIリクエストはPCからDirectusサーバーに直接送信されます。",
        disclaimerTitle: "非公式独立ツールに関する声明",
        disclaimerDesc: "本ソフトウェアはサードパーティ製の独立したコミュニティツールであり、Directus公式（Monospace Ltd）によって直接提供、維持、または推奨されているものではありません。"
      },
      flow: {
        title: "簡単な3ステップで素早く開始",
        step1: "サーバープロファイル設定",
        step1Desc: "「プロファイル」タブでDirectusのサーバーURLとログイン情報を追加します。静的トークンを直接入力して接続することも可能です。接続トークンは自動的にバックグラウンドで更新されます。",
        step2: "アップロードテンプレートの構築",
        step2Desc: "「テンプレート」タブで新しい設定を追加します。保存先フォルダ、ファイル名の重複防止ルール、MD5重複チェック、およびDouble-stepコレクションの自動連携などを設定できます。",
        step3: "ドラッグ、ドロップ、自動コピー",
        step3Desc: "「アップロード」タブに移動し、プロファイルとテンプレートを選択してファイルをドロップします。アップロード成功後、選択したフォーマットのリンクが自動でコピーされます。"
      },
      details: {
        title: "高度なコア機能の解説",
        md5Title: "MD5重複防止機能",
        md5Desc: "有効にすると、DropTusはアップロード前にファイルMD5ハッシュを計算して照合します。すでにサーバーに存在するファイルの場合は、新規アップロードをスキップして既存のファイルを再利用し、サーバー容量を節約します。",
        pathTitle: "S3 CDN直連網址書き換え",
        pathDesc: "DirectusでAWS S3やカスタムCDNを使用している場合、CDNベース接頭辞を設定できます。最終的に出力されるリンクは自動で書き換えられ、高速なロードを実現します。",
        relationTitle: "Double-stepコレクション自動連携",
        relationDesc: "ファイルアップロード（ステップ1）と同時に、指定したコレクションに自動的にレコードを追加（ステップ2）してファイルIDを関連付けます。ドロップ前にUIでカスタム動的フィールドを入力可能です。"
      }
    },
    auth: {
      title: "Directus プロファイル",
      addProfile: "プロファイルを追加",
      editProfile: "プロファイルを編集",
      name: "プロファイル名",
      url: "Directus サーバー URL",
      urlPlaceholder: "例: https://directus.example.com",
      authMethod: "認証方式",
      methodToken: "静的トークン (Static Token)",
      methodPassword: "ユーザー名とパスワード",
      token: "静的トークン",
      tokenPlaceholder: "Directusの静的トークンを入力してください",
      email: "メールアドレス",
      emailPlaceholder: "ログイン用のメールアドレスを入力してください",
      password: "パスワード",
      passwordPlaceholder: "パスワードを入力してください",
      statusConnected: "接続完了",
      statusFailed: "接続失敗",
      login: "接続してログイン",
      save: "プロファイルを保存",
      deleteConfirm: "このプロファイルを削除してもよろしいですか？",
      activeProfile: "現在のアクティブ",
      useThis: "このプロファイルを使用",
      tokenExpired: "セッションの期限が切れました。再ログインしてください。",
      tokenValid: "接続正常"
    },
    settings: {
      title: "アップロードテンプレート",
      addTemplate: "テンプレートを追加",
      editTemplate: "テンプレートを編集",
      name: "テンプレート名",
      folder: "保存先フォルダ",
      syncFolders: "サーバーのフォルダを同期",
      rootFolder: "ルートディレクトリ (フォルダなし)",
      rename: "ファイル命名ルール",
      renameDesc: "空欄の場合は元のファイル名が使用されます。変数: {y}年、{m}月、{d}日、{h}時、{i}分、{s}秒、{filename}元のファイル名、{rand:N}ランダム数値、{uuid:N}ランダムUUID。例: {y}{m}{d}-{filename}-{rand:4}",
      checkDuplicate: "MD5 重複チェックを有効にする",
      checkDuplicateDesc: "ファイルのMD5を計算し、サーバーに同じファイルがある場合は再利用して容量を節約します。",
      cdnPrefix: "CDN URL 書き換え接頭辞",
      cdnPrefixPlaceholder: "例: https://cdn.example.com/assets",
      cdnPrefixDesc: "空欄の場合はDirectusのオリジナルURLを使用します。S3 + CDNを使用している場合に指定します。",
      relation: "Double-step コレクション連携",
      enableRelation: "コレクション自動書き込みを有効にする",
      collectionName: "対象コレクション名",
      collectionNamePlaceholder: "例: articles",
      fileField: "ファイル ID フィールド",
      fileFieldPlaceholder: "例: cover_image",
      dynamicFields: "カスタム動的フィールド設定",
      fieldName: "フィールドキー",
      fieldLabel: "表示ラベル (Label)",
      fieldType: "フィールドタイプ",
      fieldVal: "デフォルト値 (任意)",
      addDynamicField: "動的フィールドを追加",
      deleteTemplateConfirm: "このテンプレートを削除してもよろしいですか？",
      activeTemplate: "現在使用中",
      useThis: "このテンプレートを使用"
    },
    upload: {
      title: "アップロードワークスペース",
      dragTip: "ここにファイルをドラッグ＆ドロップするか、クリックしてファイルを選択します",
      uploading: "{0} をアップロード中...",
      errorNoProfile: "サイドバーで先にDirectusプロファイルを設定し、接続してください。",
      errorNoTemplate: "先にアップロードテンプレートを設定してください。",
      selectProfile: "プロファイル",
      selectTemplate: "テンプレート",
      selectFormat: "リンクの形式",
      dynamicInputs: "コレクション動的フィールド入力",
      fileInfo: "ファイル情報",
      size: "サイズ",
      copiedFormat: "{0} 形式でコピーしました！",
      uploadSuccessNotify: "アップロード成功！リンクをクリップボードにコピーしました",
      uploadFailedNotify: "アップロード失敗: {0}"
    },
    history: {
      title: "アップロード履歴",
      searchPlaceholder: "ファイルを検索...",
      clearAll: "履歴をクリア",
      clearAllConfirm: "すべてのアップロード履歴を削除しますか？(ローカルキャッシュのみ削除され、サーバーのファイルは削除されません)",
      copyLink: "リンクをコピー",
      openInBrowser: "ブラウザで開く",
      copyAllLinks: "すべてのリンクをコピー"
    },
    tray: {
      dragTip: "ここにファイルをドロップしてアップロード",
      alwaysOnTop: "ウインドウを固定",
      statusConnected: "接続中: {0}",
      statusDisconnected: "Directusに未接続",
      activeTemplate: "使用中テンプレート: {0}",
      pleaseLogin: "メインアプリでプロファイルの設定と接続ログインを完了させてください。"
    }
  },
  "ko": {
    common: {
      save: "설정 저장",
      saving: "저장 중...",
      cancel: "취소",
      delete: "삭제",
      confirm: "확인",
      edit: "편집",
      add: "추가",
      success: "성공",
      failed: "실패",
      copied: "클립보드에 복사되었습니다",
      noData: "데이터 없음",
      loading: "로딩 중...",
      disconnected: "연결 안 됨",
      theme: {
        light: "라이트 모드",
        dark: "다크 모드",
        system: "시스템 설정 따름",
        descLight: "현재 라이트 모드입니다. 클릭하여 다크 모드로 전환합니다",
        descDark: "현재 다크 모드입니다. 클릭하여 시스템 모드로 전환합니다",
        descSystem: "현재 시스템 설정 모드입니다. 클릭하여 라이트 모드로 전환합니다"
      },
      language: {
        auto: "자동 감지",
        select: "언어 설정",
        title: "인터페이스 언어"
      }
    },
    sidebar: {
      upload: "업로드",
      history: "내역",
      profiles: "프로필",
      settings: "템플릿",
      collapsed: "사이드바 접기",
      expand: "사이드바 펼치기",
      help: "도움말 및 이용 가이드"
    },
    help: {
      title: "DropTus 이용 가이드 및 선언",
      tabIntro: "소개 및 성명",
      tabFlow: "초보자 온보딩",
      tabDetails: "고급 가이드",
      intro: {
        welcome: "DropTus에 오신 것을 환영합니다",
        subtitle: "Directus 전용 초간편 파일 업로드 보조 도구",
        desc: "DropTus는 'Directus 파일 업로드'와 '데이터베이스 컬렉션 자동 연동'을 단순화하기 위해 설계된 독립 서드파티 보조 도구입니다. 간단한 드래그 앤 드롭 동작으로 이미지나 스크린샷을 서버에 업로드하고, 클립보드에 복사 가능한 형식의 링크(Raw URL, Markdown, HTML)를 자동으로 생성해 줍니다.",
        privacyTitle: "보안 및 개인정보 보장",
        privacyDesc: "로그인 증명(이메일, 비밀번호, 토큰), 서버 URL, 템플릿 등의 모든 데이터는 100% 사용자의 PC settings.json 파일에만 저장됩니다. 어떠한 클라우드 서버도 경유하지 않으며, 모든 API 요청은 로컬 머신에서 Directus 서버로 직접 전송됩니다.",
        disclaimerTitle: "비공식 독립 도구 선언",
        disclaimerDesc: "본 소프트웨어는 서드파티 독립 커뮤니티 도구이며, Directus 공식(Monospace Ltd)에서 직접 제공, 유지 또는 보증하지 않습니다."
      },
      flow: {
        title: "간단한 3단계로 빠르게 시작",
        step1: "서버 프로필 설정",
        step1Desc: "'프로필' 탭으로 이동하여 Directus 서버 URL과 로그인 정보를 입력합니다. 정적 토큰을 직접 입력하여 연결할 수도 있습니다. 접속 토큰은 백그라운드에서 자동으로 갱신됩니다.",
        step2: "업로드 템플릿 생성",
        step2Desc: "'템플릿' 탭에서 새 템플릿을 생성합니다. 대상 저장 폴더, 파일명 중복 방지 규칙(타임스탬프, UUID 등 지원), MD5 중복 체크, 그리고 Double-step 컬렉션 자동 연동 설정을 구성할 수 있습니다.",
        step3: "드래그, 드롭 및 자동 복사",
        step3Desc: "'업로드' 탭으로 이동하여 프로필과 구성된 템플릿 설정을 선택한 후 파일을 드롭합니다. 업로드가 완료되면 선택한 형식의 링크가 클립보드에 자동으로 복사됩니다."
      },
      details: {
        title: "고급 핵심 기능 해설",
        md5Title: "MD5 중복 방지 기능",
        md5Desc: "활성화되면 DropTus는 업로드 전 파일의 MD5 해시를 로컬에서 계산하여 서버에 조회합니다. 이미 존재하는 파일인 경우 업로드를 건너뛰고 기존 파일을 재사용하므로 서버 저장 공간과 네트워크 트래픽을 아낄 수 있습니다.",
        pathTitle: "S3 CDN 직련 주소 재작성",
        pathDesc: "Directus에서 AWS S3 또는 커스텀 CDN을 사용하는 경우 CDN 기본 접두사를 구성하십시오. 최종 반환되는 링크는 자동으로 재작성되어 리소스를 훨씬 빠르게 제공합니다.",
        relationTitle: "Double-step 컬렉션 연동",
        relationDesc: "파일 업로드(1단계)와 동시에 지정된 다른 컬렉션에 새 데이터 레코드를 자동으로 추가(2단계)하여 파일 ID를 연동합니다. 드롭하기 전에 UI에서 커스텀 메타데이터 필드 값을 동적으로 직접 입력할 수 있습니다."
      }
    },
    auth: {
      title: "Directus 프로필",
      addProfile: "프로필 추가",
      editProfile: "프로필 편집",
      name: "프로필 이름",
      url: "Directus 서버 URL",
      urlPlaceholder: "예: https://directus.example.com",
      authMethod: "인증 방식",
      methodToken: "정적 토큰 (Static Token)",
      methodPassword: "사용자 이메일 및 비밀번호",
      token: "정적 토큰",
      tokenPlaceholder: "Directus 정적 토큰을 입력하십시오",
      email: "이메일 주소",
      emailPlaceholder: "로그인용 이메일 주소를 입력하십시오",
      password: "비밀번호",
      passwordPlaceholder: "비밀번호를 입력하십시오",
      statusConnected: "연결 성공",
      statusFailed: "연결 실패",
      login: "연결 및 로그인",
      save: "프로필 저장",
      deleteConfirm: "이 프로필을 삭제하시겠습니까?",
      activeProfile: "현재 사용 중",
      useThis: "이 프로필 사용",
      tokenExpired: "세션이 만료되었습니다. 다시 로그인해 주십시오.",
      tokenValid: "연결 정상"
    },
    settings: {
      title: "업로드 템플릿",
      addTemplate: "템플릿 추가",
      editTemplate: "템플릿 편집",
      name: "템플릿 이름",
      folder: "대상 저장 폴더",
      syncFolders: "서버 폴더 동기화",
      rootFolder: "루트 디렉토리 (폴더 없음)",
      rename: "파일명 재정의 규칙",
      renameDesc: "비워두면 원본 파일명이 사용됩니다. 지원 변수: {y}년, {m}월, {d}일, {h}시, {i}분, {s}초, {filename}원본이름, {rand:N}무작위 숫자, {uuid:N}무작위 UUID. 예: {y}{m}{d}-{filename}-{rand:4}",
      checkDuplicate: "MD5 중복 체크 활성화",
      checkDuplicateDesc: "파일의 MD5를 계산하여 서버에 동일한 파일이 있으면 재사용하여 공간을 절약합니다.",
      cdnPrefix: "CDN URL 재작성 접두사",
      cdnPrefixPlaceholder: "예: https://cdn.example.com/assets",
      cdnPrefixDesc: "비워두면 Directus 기본 URL을 사용합니다. S3 + CDN을 사용하는 경우 지정합니다.",
      relation: "Double-step 컬렉션 연동",
      enableRelation: "컬렉션 자동 쓰기 활성화",
      collectionName: "대상 컬렉션 이름",
      collectionNamePlaceholder: "예: articles",
      fileField: "파일 ID 필드",
      fileFieldPlaceholder: "예: cover_image",
      dynamicFields: "사용자 정의 동적 필드 설정",
      fieldName: "필드 키",
      fieldLabel: "표시 라벨 (Label)",
      fieldType: "필드 타입",
      fieldVal: "기본값 (선택 사항)",
      addDynamicField: "동적 필드 추가",
      deleteTemplateConfirm: "이 템플릿을 삭제하시겠습니까?",
      activeTemplate: "현재 사용 중",
      useThis: "이 템플릿 사용"
    },
    upload: {
      title: "업로드 작업 영역",
      dragTip: "여기에 파일을 드래그 앤 드롭하거나 클릭하여 파일 선택",
      uploading: "{0} 업로드 중...",
      errorNoProfile: "사이드바에서 먼저 Directus 프로필을 설정하고 로그인해 주십시오.",
      errorNoTemplate: "먼저 업로드 템플릿을 설정해 주십시오.",
      selectProfile: "프로필",
      selectTemplate: "템플릿",
      selectFormat: "링크 형식",
      dynamicInputs: "컬렉션 동적 필드 입력",
      fileInfo: "파일 정보",
      size: "크기",
      copiedFormat: "{0} 형식으로 복사되었습니다!",
      uploadSuccessNotify: "업로드 성공! 링크가 클립보드에 복사되었습니다",
      uploadFailedNotify: "업로드 실패: {0}"
    },
    history: {
      title: "업로드 내역",
      searchPlaceholder: "파일명 검색...",
      clearAll: "내역 지우기",
      clearAllConfirm: "모든 업로드 내역을 삭제하시겠습니까? (로컬 캐시만 삭제되며 서버 파일에는 영향을 주지 않습니다)",
      copyLink: "링크 복사",
      openInBrowser: "브라우저에서 열기",
      copyAllLinks: "모든 링크 복사"
    },
    tray: {
      dragTip: "여기에 파일을 드롭하여 업로드",
      alwaysOnTop: "창 고정",
      statusConnected: "연결됨: {0}",
      statusDisconnected: "Directus에 연결되지 않음",
      activeTemplate: "현재 템플릿: {0}",
      pleaseLogin: "기본 프로그램에서 프로필 설정 및 접속 로그인을 완료해 주십시오."
    }
  }
};

// 格式化翻譯函數
export function t(key: string, ...args: any[]): string {
  const parts = key.split(".");
  let current: any = translations[locale.value] || translations["en"];
  
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      // 找不到時，fallback 到英文
      let fallback: any = translations["en"];
      for (const p of parts) {
        if (fallback && typeof fallback === "object" && p in fallback) {
          fallback = fallback[p];
        } else {
          fallback = key;
          break;
        }
      }
      current = fallback;
      break;
    }
  }
  
  if (typeof current === "string") {
    return current.replace(/{(\d+)}/g, (match, index) => {
      return typeof args[index] !== "undefined" ? args[index] : match;
    });
  }
  
  return key;
}
