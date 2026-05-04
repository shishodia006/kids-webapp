"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    konnectlyNotify?: (notification: KonnectlyNotificationPayload) => Promise<boolean>;
    konnectlyRequestNotifications?: () => Promise<NotificationPermission>;
  }
}

type KonnectlyNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
};

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/konnectly-sw.js", { scope: "/" });
        if (!active) return;

        window.konnectlyRequestNotifications = async () => {
          if (!("Notification" in window)) return "denied";
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
    };
  }, []);

  return null;
}

async function savePushSubscription(registration: ServiceWorkerRegistration) {
  if (!("PushManager" in window)) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch("/api/app/push-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  }).catch(() => undefined);
}
