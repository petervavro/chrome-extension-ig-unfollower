const overlayDot = document.createElement("span");
Object.assign(overlayDot.style, {
  flexShrink: "0",
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: "#ff6600",
  animation: "ig-unfollower-pulse 1.2s ease-in-out infinite",
});

const overlayText = document.createElement("span");
Object.assign(overlayText.style, {
  fontSize: "13px",
  lineHeight: "1.4",
  color: "#e65100",
});
overlayText.textContent =
  "Unfollow automation running. Keep this tab visible. Click the extension icon to stop.";

const overlayCard = document.createElement("div");
Object.assign(overlayCard.style, {
  position: "absolute",
  bottom: "35vh",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#fff",
  border: "1.5px solid #ffcc80",
  borderRadius: "10px",
  padding: "12px 16px",
  width: "320px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});
overlayCard.appendChild(overlayDot);
overlayCard.appendChild(overlayText);

const overlayStyle = document.createElement("style");
overlayStyle.textContent =
  "@keyframes ig-unfollower-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }";

const overlay = document.createElement("div");
Object.assign(overlay.style, {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.45)",
  display: "none",
  zIndex: "2147483647",
});

overlay.appendChild(overlayStyle);
overlay.appendChild(overlayCard);
document.body.appendChild(overlay);

let task = null;

chrome.runtime.onMessage.addListener(async ({ action }) => {
  if (!task) return;

  if (action === "RUN") {
    try {
      overlay.style.display = "flex";
      await task.start();
    } catch (error) {
      overlay.style.display = "none";
      if (error.message === "NO_MORE_UNFOLLOW_BUTTONS") {
        await chrome.runtime.sendMessage({ action: "RETRY" });
      } else {
        await chrome.runtime.sendMessage({ action: "RESET" });
        alert("An error occurred. Please try again.");
      }
    }
  } else {
    overlay.style.display = "none";
    if (action === "STOP") task.stop();
  }
});

function onUrlChange(callback) {
  let oldHref = document.location.href;
  const observer = new MutationObserver(() => {
    if (oldHref !== document.location.href) {
      oldHref = document.location.href;
      callback();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

let checkTimeout = null;
let checkAttempts = 0;
const MAX_CHECK_ATTEMPTS = 30;

async function checkIfOnCorrectPage() {
  await chrome.runtime.sendMessage({ action: "DISABLE" });
  checkAttempts = 0;

  const poll = async () => {
    if (checkAttempts++ >= MAX_CHECK_ATTEMPTS) return;
    try {
      await task.waitForElement(() => task.findFollowingDialogLink());
      await chrome.runtime.sendMessage({ action: "ENABLE" });
    } catch {
      checkTimeout = setTimeout(poll, 1000);
    }
  };

  clearTimeout(checkTimeout);
  await poll();
}

let clickDebounce = null;

window.addEventListener("load", async () => {
  task = new UnfollowTask(document);

  await checkIfOnCorrectPage();

  if (
    await task.waitForElement(() => task.findFollowingDialogLink()).catch(() =>
      null
    )
  ) {
    chrome.runtime.sendMessage({ action: "START" });
  }

  onUrlChange(checkIfOnCorrectPage);
});

window.addEventListener("click", () => {
  clearTimeout(clickDebounce);
  clickDebounce = setTimeout(checkIfOnCorrectPage, 300);
});
