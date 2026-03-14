// Views
const homeView = document.getElementById("homeView");
const chatView = document.getElementById("chatView");

// Home view elements
const aiSelect = document.getElementById("aiSelect");
const openAiBtn = document.getElementById("openAiBtn");

// Chat view elements
const aiSelectChat = document.getElementById("aiSelectChat");
const aiFrame = document.getElementById("aiFrame");
const backBtn = document.getElementById("backBtn");
const screenshotBtn = document.getElementById("screenshotBtn");
const refreshBtn = document.getElementById("refreshBtn");
const screenshotOverlay = document.getElementById("screenshotOverlay");
const screenshotPreview = document.getElementById("screenshotPreview");
const copyAgainBtn = document.getElementById("copyAgainBtn");
const dismissBtn = document.getElementById("dismissBtn");

let lastScreenshotDataUrl = null;

// ---- Navigation ----

function showChatView(url) {
  // Sync the chat toolbar dropdown to match
  aiSelectChat.value = url;
  aiFrame.src = url;
  homeView.style.display = "none";
  chatView.style.display = "flex";
}

function showHomeView() {
  chatView.style.display = "none";
  homeView.style.display = "block";
  aiFrame.src = ""; // unload iframe to save memory
  screenshotOverlay.style.display = "none";
}

// Open AI Chat button -> switch to chat view with embedded iframe
openAiBtn.addEventListener("click", () => {
  showChatView(aiSelect.value);
});

// Back button -> return to home
backBtn.addEventListener("click", showHomeView);

// Switching AI in the chat toolbar
aiSelectChat.addEventListener("change", () => {
  aiFrame.src = aiSelectChat.value;
});

// Refresh button
refreshBtn.addEventListener("click", () => {
  aiFrame.src = aiFrame.src;
});

// ---- Idea Cards ----

document.querySelectorAll(".idea-card").forEach((card) => {
  card.addEventListener("click", () => {
    const prompt = card.dataset.prompt;

    // Copy the prompt to clipboard so user can paste it into the AI chat
    navigator.clipboard.writeText(prompt).then(() => {
      showToast("Prompt copied! Paste it into the chat.");
    }).catch(() => {
      showToast("Couldn't copy prompt, but opening chat...");
    });

    // Open AI chat in the embedded view
    showChatView(aiSelect.value);
  });
});

// ---- Screenshot ----

screenshotBtn.addEventListener("click", async () => {
  screenshotBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ action: "captureScreenshot" });

    if (response.error) {
      showToast("Error: " + response.error);
      return;
    }

    lastScreenshotDataUrl = response.dataUrl;

    // Show preview overlay
    screenshotPreview.src = lastScreenshotDataUrl;
    screenshotOverlay.style.display = "block";

    // Auto-copy to clipboard
    await copyScreenshotToClipboard(lastScreenshotDataUrl);
    showToast("Screenshot copied! Paste with Ctrl+V");
  } catch (err) {
    showToast("Failed to capture screenshot");
    console.error(err);
  } finally {
    screenshotBtn.disabled = false;
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

// Copy again button
copyAgainBtn.addEventListener("click", async () => {
  if (lastScreenshotDataUrl) {
    await copyScreenshotToClipboard(lastScreenshotDataUrl);
    showToast("Copied to clipboard!");
  }
});

// Dismiss overlay
dismissBtn.addEventListener("click", () => {
  screenshotOverlay.style.display = "none";
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
