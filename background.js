function updateActionButtonState(doEnable, tabId) {
  chrome.action.setBadgeBackgroundColor({
    color: doEnable ? "#bfffdb" : "#ffc2c2",
  });

  if (doEnable) {
    chrome.action.enable(tabId);
  } else {
    chrome.action.disable(tabId);
  }
}

async function isAllowedDomain(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.url?.includes("instagram.com") ?? false;
  } catch {
    return false;
  }
}

let isOnProfile = false;

async function updateActionButtonStateByTab(tabId) {
  const isOnDomain = await isAllowedDomain(tabId);
  updateActionButtonState(isOnProfile && isOnDomain, tabId);
}

async function safeSendMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Tab may have been closed or is not ready
  }
}

chrome.tabs.onUpdated.addListener((tabId, { status }) => {
  if (status === "complete") updateActionButtonStateByTab(tabId);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateActionButtonStateByTab(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  updateActionButtonState(false);
  chrome.action.setBadgeText({ text: "OFF" });
});

const MAX_ATTEMPTS = 3;
let remainingAttempts = MAX_ATTEMPTS;

// Only true when the extension itself triggered the reload (retry or user start).
// A manual user refresh finds this false and stops the automation.
let pendingRun = false;

async function startAutomation(tab) {
  pendingRun = true;
  chrome.tabs.reload(tab.id);
}

async function resetAutomation(tab) {
  pendingRun = false;
  chrome.action.setBadgeText({ text: "OFF" });
  await safeSendMessage(tab.id, { action: "STOP" });
}

chrome.runtime.onMessage.addListener(async function ({ action }) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  switch (action) {
    case "ENABLE":
      isOnProfile = true;
      updateActionButtonStateByTab(tab.id);
      break;
    case "DISABLE":
      isOnProfile = false;
      updateActionButtonStateByTab(tab.id);
      break;
    case "INITIATE_START":
      remainingAttempts = MAX_ATTEMPTS;
      chrome.action.setBadgeText({ text: "ON" });
      await startAutomation(tab);
      break;
    case "START":
      if (pendingRun && (await chrome.action.getBadgeText({ tabId: tab.id })) === "ON") {
        pendingRun = false;
        await safeSendMessage(tab.id, { action: "RUN" });
      } else {
        // User manually refreshed — stop automation
        await resetAutomation(tab);
      }
      break;
    case "RESET":
      await resetAutomation(tab);
      break;
    case "RETRY":
      if (--remainingAttempts > 0) {
        await startAutomation(tab);
      } else {
        await resetAutomation(tab);
        console.warn(`Automation failed after ${MAX_ATTEMPTS} attempts.`);
      }
      break;
    default:
      break;
  }
});
