try {
  chrome.devtools.panels.create(
    "OPFS Explorer",
    "icons/icon-128.png",
    "panel.html",
    () => {
      console.log("OPFS Explorer panel created");
    }
  );
} catch (e) {
  console.error("Failed to create DevTools panel:", e);
}
