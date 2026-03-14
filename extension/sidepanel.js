// DOM elements
const aiSelect = document.getElementById("aiSelect");
const openAiBtn = document.getElementById("openAiBtn");
const screenshotBtn = document.getElementById("screenshotBtn");
const previewSection = document.getElementById("previewSection");
const screenshotPreview = document.getElementById("screenshotPreview");
const copyBtn = document.getElementById("copyBtn");
const dismissBtn = document.getElementById("dismissBtn");
const ideasSection = document.getElementById("ideasSection");

let lastScreenshotDataUrl = null;

// Open the selected AI in a new tab
openAiBtn.addEventListener("click", () => {
  const url = aiSelect.value;
  chrome.tabs.create({ url });
});

// Idea cards - open AI and copy prompt
document.querySelectorAll(".idea-card").forEach((card) => {
  card.addEventListener("click", () => {
    const prompt = card.dataset.prompt;
    const url = aiSelect.value;

    // Copy the prompt to clipboard so user can paste it
    navigator.clipboard.writeText(prompt).then(() => {
      showToast("Prompt copied! Paste it into your AI chat.");
      chrome.tabs.create({ url });
    }).catch(() => {
      // Fallback: open the tab anyway
      chrome.tabs.create({ url });
    });
  });
});

// Screenshot button
screenshotBtn.addEventListener("click", async () => {
  screenshotBtn.disabled = true;
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

    // Auto-copy to clipboard as an image
    await copyScreenshotToClipboard(lastScreenshotDataUrl);

    // Open the AI chat tab if not already open
    const url = aiSelect.value;
    chrome.tabs.query({}, (tabs) => {
      const aiTab = tabs.find((t) => t.url && t.url.startsWith(url));
      if (aiTab) {
        // Focus existing AI tab
        chrome.tabs.update(aiTab.id, { active: true });
      } else {
        chrome.tabs.create({ url });
      }
    });

    showToast("Screenshot copied! Paste into AI chat with Ctrl+V");
  } catch (err) {
    showToast("Failed to capture screenshot");
    console.error(err);
  } finally {
    screenshotBtn.disabled = false;
    screenshotBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      Screenshot &amp; Paste to AI
    `;
  }
});

// Copy screenshot to clipboard as image
async function copyScreenshotToClipboard(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    document.querySelector(".preview-hint").classList.add("visible");
  } catch (err) {
    console.error("Clipboard write failed:", err);
  }
}

// Copy button in preview
copyBtn.addEventListener("click", async () => {
  if (lastScreenshotDataUrl) {
    await copyScreenshotToClipboard(lastScreenshotDataUrl);
    showToast("Copied to clipboard! Paste with Ctrl+V / Cmd+V");
  }
});

// Dismiss preview
dismissBtn.addEventListener("click", () => {
  previewSection.style.display = "none";
  document.querySelector(".preview-hint").classList.remove("visible");
  lastScreenshotDataUrl = null;
});

// Toast notification
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
