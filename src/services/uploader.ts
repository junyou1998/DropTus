export function formatLink(
  url: string,
  filename: string,
  format: string,
  customPattern?: string
): string {
  switch (format) {
    case "markdown":
      return `![${filename}](${url})`;
    case "html":
      return `<img src="${url}" alt="${filename}" />`;
    case "custom":
      if (customPattern) {
        return customPattern.replace(/{url}/g, url).replace(/{filename}/g, filename);
      }
      return url;
    case "url":
    default:
      return url;
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  let copied = false;

  // 1. 嘗試 Tauri 原生剪貼簿插件 (動態導入防止載入錯誤)
  try {
    const clipboard = await import("@tauri-apps/plugin-clipboard-manager");
    if (clipboard && typeof clipboard.writeText === "function") {
      await clipboard.writeText(text);
      copied = true;
    }
  } catch (e) {
    console.warn("Tauri native clipboard failed or not loaded:", e);
  }

  // 2. 嘗試現代網頁 Clipboard API
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (e) {
    console.warn("navigator.clipboard failed:", e);
  }

  // 3. 極限 Fallback：虛擬 textarea 選取複製法
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.style.width = "2px";
    textArea.style.height = "2px";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    
    document.body.appendChild(textArea);
    textArea.select();
    
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    
    if (successful) {
      copied = true;
    }
  } catch (fallbackErr) {
    console.warn("Textarea fallback failed:", fallbackErr);
  }

  if (!copied) {
    throw new Error("無法自動寫入剪貼簿");
  }
}

export async function copyAllLinks(
  items: Array<{ url: string; name: string }>,
  format: string,
  customPattern?: string
): Promise<void> {
  const links = items.map((item) => formatLink(item.url, item.name, format, customPattern));
  await copyToClipboard(links.join("\n"));
}

