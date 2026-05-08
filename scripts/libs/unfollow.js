class UnfollowTask {
  isStopped = false;
  document;

  constructor(document) {
    this.document = document;
  }

  // Function to pause execution for a given number of milliseconds
  static sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  // Function to generate a random number between min and max
  static getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Function to wait for a specific DOM node to appear
  async waitForElement(assertion = () => true) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const element = assertion(this.document);

        if (element) {
          clearInterval(checkInterval);
          resolve(element);
        }
      }, 100); // Check every 100ms

      // Optional: Add a timeout to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Timeout waiting for element."));
      }, 20000);
    });
  }

  // Finds the link element that navigates to the "following" dialog on Instagram.
  findFollowingDialogLink() {
    return Array.from(this.document.querySelectorAll('[role="link"]')).find(
      (el) => el.textContent.includes(" following"),
    );
  }

  async loadFollowingAccounts(previousAccounts = []) {
    const MAX_ATTEMPTS = 3;
    let attempts = 0;
    let currentAccounts = [];

    const dialog = this.document.querySelectorAll('[role="dialog"]')[0];

    // Get dialog with followers
    const listContainer = Array.from(
      dialog.querySelectorAll("*"),
    ).find((el) => {
      const style = el.getAttribute("style");
      return (
        style &&
        style.includes("display: flex") &&
        style.includes("flex-direction: column") &&
        style.includes("padding-bottom: 0px") &&
        style.includes("padding-top: 0px") &&
        style.includes("position: relative")
      );
    });

    listContainer.scroll({
      top: 0,
      behavior: "smooth",
    });

    do {
      await UnfollowTask.sleep(UnfollowTask.getRandomNumber(1135, 3910));

      // Get buttons
      currentAccounts = [...dialog.querySelectorAll('[type="button"]')]
        .filter(({ innerText }) => innerText === "Following")
        .map((btn) => ({
          name:
            btn.parentElement.parentElement.previousSibling.querySelectorAll(
              '[role="link"]',
            )[0].text,
          button: btn,
        }));

      // Remove previously processed buttons
      const previousAccountNames = previousAccounts.map(({ name }) => name);

      currentAccounts = currentAccounts.filter(
        ({ name }) => !previousAccountNames.includes(name),
      );

      // Prevent looping
      if (!currentAccounts.length && ++attempts > MAX_ATTEMPTS) {
        throw new Error("NO_MORE_UNFOLLOW_BUTTONS");
      }

      // Scroll to the bottom
      listContainer.scrollTo(0, listContainer.scrollHeight);
    } while (!currentAccounts.length);

    return currentAccounts;
  }

  async unfollowAccount(accountUnfollowButton) {
    const initialDialogCount = (
      await this.waitForElement(() =>
        this.document.querySelectorAll('[role="dialog"]')
      )
    ).length;

    // Scroll to follow button
    accountUnfollowButton.scrollIntoView();

    await UnfollowTask.sleep(UnfollowTask.getRandomNumber(1231, 1860));

    // Click "Following" button
    accountUnfollowButton.dispatchEvent(
      new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: false,
      }),
    );

    await UnfollowTask.sleep(UnfollowTask.getRandomNumber(1135, 1910));

    // Check for confirmation dialog
    const dialogs = await this.waitForElement(() =>
      this.document.querySelectorAll('[role="dialog"]')
    );

    if (initialDialogCount < dialogs.length) {
      const unfollowButton =
        dialogs[dialogs.length - 1].querySelectorAll("button")[0];

      if (!unfollowButton) throw new Error("NO_UNFOLLOW_BUTTONS");

      // Click "Unfollow" button within confirmation dialog
      unfollowButton.dispatchEvent(
        new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: false,
        }),
      );
    }
  }

  async execute() {
    (await this.waitForElement(() => this.findFollowingDialogLink())).click();

    await UnfollowTask.sleep(UnfollowTask.getRandomNumber(3135, 4910));

    let previousAccounts = [];
    let actionButtons = [];

    while (
      (actionButtons = await this.loadFollowingAccounts(previousAccounts))
    ) {
      for (let i = 0; i < actionButtons.length; i++) {
        if (this.isStopped) break;

        await this.unfollowAccount(actionButtons[i].button);

        previousAccounts.push(actionButtons[i]);
      }
    }
  }

  async start() {
    this.isStopped = false;
    await this.execute();
  }

  stop() {
    this.isStopped = true;
  }
}
