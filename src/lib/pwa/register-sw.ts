export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator))
    return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "activated" &&
          navigator.serviceWorker.controller
        ) {
          // New service worker version activated
        }
      });
    });

    return registration;
  } catch (err) {
    console.error("[SW] Registration failed:", err);
    return null;
  }
}
