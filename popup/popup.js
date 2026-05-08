const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const toggleBtn = document.getElementById("toggle-btn");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function getBadgeText(tabId) {
  return chrome.action.getBadgeText({ tabId });
}

async function syncState() {
  const tab = await getActiveTab();

  if (!tab || !tab.url?.includes("instagram.com")) {
    setState("idle", "Navigate to your Instagram profile to begin.", false);
    return;
  }

  const isEnabled = await chrome.action.isEnabled(tab.id).catch(() => false);
  if (!isEnabled) {
    setState("idle", "Go to your profile page on Instagram.", false);
    return;
  }

  const badge = await getBadgeText(tab.id);
  if (badge === "ON") {
    setState("running", "Automation is running…", true, true);
  } else {
    setState("ready", "Ready. Click the button to start unfollowing.", true, false);
  }
}

function setState(type, message, btnEnabled, isRunning = false) {
  statusCard.className = `status-card ${type}`;
  statusText.textContent = message;
  toggleBtn.disabled = !btnEnabled;
  toggleBtn.textContent = isRunning ? "Stop" : "Start Unfollowing";
  toggleBtn.className = isRunning ? "btn stop" : "btn";
}

toggleBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab) return;

  const badge = await getBadgeText(tab.id);
  const isON = badge === "ON";

  if (isON) {
    await chrome.tabs.sendMessage(tab.id, { action: "STOP" }).catch(() => {});
    await chrome.action.setBadgeText({ text: "OFF" });
  } else {
    await chrome.action.setBadgeText({ text: "ON" });
    chrome.tabs.reload(tab.id);
    window.close();
    return;
  }

  await syncState();
});

syncState();
