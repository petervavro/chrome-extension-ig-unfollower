const overlayContent = document.createElement("p");
Object.assign(overlayContent.style, {
  color: "#fff",
  backgroundColor: "#ff6600",
  borderRadius: "1rem",
  padding: "1rem",
});
overlayContent.textContent =
  "Instagram unfollow automation in progress. Please wait. It is necessary to keep this window on screen. You can stop the process by clicking the extension icon.";

const overlay = document.createElement("div");
Object.assign(overlay.style, {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "none",
  justifyContent: "center",
  alignItems: "center",
  zIndex: "1000",
});

overlay.appendChild(overlayContent);
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
