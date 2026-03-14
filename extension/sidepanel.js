// DOM elements
const aiSelect = document.getElementById("aiSelect");
const openAiBtn = document.getElementById("openAiBtn");
const screenshotBtn = document.getElementById("screenshotBtn");
const previewSection = document.getElementById("previewSection");
const screenshotPreview = document.getElementById("screenshotPreview");
const copyBtn = document.getElementById("copyBtn");
const dismissBtn = document.getElementById("dismissBtn");

let lastScreenshotDataUrl = null;
let aiTabId = null; // Track the AI tab we opened

// ---- Open AI in the browser tab next to the side panel ----

openAiBtn.addEventListener("click", () => {
  const url = aiSelect.value;
  openOrFocusAiTab(url);
});

// When switching AI, update the tracked tab
aiSelect.addEventListener("change", () => {
  // If we already have an AI tab open, navigate it
  if (aiTabId !== null) {
    chrome.tabs.get(aiTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        // Tab was closed, open a new one
        openOrFocusAiTab(aiSelect.value);
      } else {
        chrome.tabs.update(aiTabId, { url: aiSelect.value, active: true });
      }
    });
  }
});

function openOrFocusAiTab(url) {
  // First check if we already have the AI tab open
  if (aiTabId !== null) {
    chrome.tabs.get(aiTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        // Tab was closed, create new one
        createAiTab(url);
      } else {
        // Navigate and focus existing tab
        chrome.tabs.update(aiTabId, { url, active: true });
      }
    });
  } else {
    // Look for an existing tab with any of the AI URLs
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const aiUrls = ["claude.ai", "chat.openai.com", "gemini.google.com", "copilot.microsoft.com"];
      const existing = tabs.find((t) => t.url && aiUrls.some((u) => t.url.includes(u)));
      if (existing) {
        aiTabId = existing.id;
        chrome.tabs.update(existing.id, { url, active: true });
      } else {
        createAiTab(url);
      }
    });
  }
}

function createAiTab(url) {
  chrome.tabs.create({ url }, (tab) => {
    aiTabId = tab.id;
  });
}

// Clean up if the AI tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === aiTabId) {
    aiTabId = null;
  }
});

// ---- Idea Cards ----

document.querySelectorAll(".idea-card").forEach((card) => {
  card.addEventListener("click", () => {
    const prompt = card.dataset.prompt;
    const url = aiSelect.value;

    // Copy the prompt to clipboard so user can paste it into the AI chat
    navigator.clipboard.writeText(prompt).then(() => {
      showToast("Prompt copied! Paste it into your AI chat.");
    }).catch(() => {
      showToast("Opening AI chat...");
    });

    // Open AI in the browser tab
    openOrFocusAiTab(url);
  });
});

// ---- Screenshot ----

screenshotBtn.addEventListener("click", async () => {
  screenshotBtn.disabled = true;
  const originalHTML = screenshotBtn.innerHTML;
  screenshotBtn.textContent = "Capturing...";

  try {
    const response = await chrome.runtime.sendMessage({ action: "captureScreenshot" });

    if (response.error) {
      showToast("Error: " + response.error);
      return;
    }

    lastScreenshotDataUrl = response.dataUrl;

    // Show preview
    screenshotPreview.src = lastScreenshotDataUrl;
    previewSection.style.display = "block";

    // Auto-copy to clipboard as image
    await copyScreenshotToClipboard(lastScreenshotDataUrl);

    // Focus the AI tab so user can paste
    if (aiTabId !== null) {
      chrome.tabs.update(aiTabId, { active: true });
    }

    showToast("Screenshot copied! Paste with Ctrl+V / Cmd+V");
  } catch (err) {
    showToast("Failed to capture screenshot");
    console.error(err);
  } finally {
    screenshotBtn.disabled = false;
    screenshotBtn.innerHTML = originalHTML;
  }
});

// Copy screenshot to clipboard as image
async function copyScreenshotToClipboard(dataUrl) {
  try {
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
  } catch (err) {
    console.error("Clipboard write failed:", err);
  }
}

// Copy again
copyBtn.addEventListener("click", async () => {
  if (lastScreenshotDataUrl) {
    await copyScreenshotToClipboard(lastScreenshotDataUrl);
    showToast("Copied to clipboard!");
  }
});

// Dismiss preview
dismissBtn.addEventListener("click", () => {
  previewSection.style.display = "none";
  lastScreenshotDataUrl = null;
});

// ---- Toast ----

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
