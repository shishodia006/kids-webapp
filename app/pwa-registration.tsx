"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    konnectlyInstallApp?: () => Promise<boolean>;
    konnectlyIsAppInstalled?: () => boolean;
    konnectlyNotify?: (notification: KonnectlyNotificationPayload) => Promise<boolean>;
    konnectlyRequestNotifications?: () => Promise<NotificationPermission>;
  }
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type KonnectlyNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
};

const APP_INSTALL_STORAGE_KEY = "konnectly_app_installed";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;
    let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      deferredInstallPrompt = event as BeforeInstallPromptEvent;
    }

    function handleAppInstalled() {
      markAppInstalled();
      deferredInstallPrompt = null;
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    window.konnectlyIsAppInstalled = isKonnectlyAppInstalled;

    window.konnectlyInstallApp = async () => {
      if (!deferredInstallPrompt) {
        await window.konnectlyRequestNotifications?.();
        return false;
      }

      const prompt = deferredInstallPrompt;
      deferredInstallPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        markAppInstalled();
        await window.konnectlyRequestNotifications?.();
      }
      return choice.outcome === "accepted";
    };

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/konnectly-sw.js", { scope: "/" });
        if (!active) return;

        window.konnectlyRequestNotifications = async () => {
          if (!("Notification" in window)) return "denied";
          if (Notification.permission === "granted") {
            void savePushSubscription(registration);
            return "granted";
          }
          if (Notification.permission !== "default") return Notification.permission;
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            void savePushSubscription(registration);
          }
          return permission;
        };

        if ("Notification" in window && Notification.permission === "granted") {
          void savePushSubscription(registration);
        }

        window.konnectlyNotify = async (notification) => {
          if (!("Notification" in window)) return false;

          const permission = Notification.permission === "granted" ? "granted" : await window.konnectlyRequestNotifications?.();
          if (permission !== "granted") return false;

          const controller = navigator.serviceWorker.controller;
          const worker = controller ?? registration.active ?? registration.waiting ?? registration.installing;
          worker?.postMessage({ type: "SHOW_NOTIFICATION", ...notification });
          return Boolean(worker);
        };
      } catch (error) {
        console.error("Unable to register Konnectly service worker", error);
      }
    }

    registerServiceWorker();

    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      delete window.konnectlyInstallApp;
      delete window.konnectlyIsAppInstalled;
    };
  }, []);

  return null;
}

function isKonnectlyAppInstalled() {
  return isStandaloneApp() || hasStoredInstallRecord();
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function hasStoredInstallRecord() {
  try {
    return window.localStorage.getItem(APP_INSTALL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markAppInstalled() {
  try {
    window.localStorage.setItem(APP_INSTALL_STORAGE_KEY, "true");
  } catch {
    // Installation still succeeds even if storage is unavailable.
  }
}

async function savePushSubscription(registration: ServiceWorkerRegistration) {
  if (!("PushManager" in window)) return;

  let subscription = await registration.pushManager.getSubscription();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!subscription && publicKey) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  if (!subscription) return;

  await fetch("/api/app/push-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  }).catch(() => undefined);
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}
