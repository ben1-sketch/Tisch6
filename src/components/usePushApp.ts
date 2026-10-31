"use client";

import { useEffect, useState } from "react";

export type PushEnv = { standalone: boolean; ios: boolean; push: boolean };
/** Chrome/Android: Installations-Dialog, den die Seite selbst öffnen darf */
type InstallPrompt = Event & { prompt: () => Promise<void> };
/** Rückmeldungen nach einem Klick – aus dem Wörterbuch (Gäste-App) oder fest (Admin-App) */
export type PushTexts = { enabled: string; disabled: string; testSent: string; error: string; pushBlocked: string };

/** VAPID-Schlüssel (Base64url) → Bytes für pushManager.subscribe */
function keyBytes(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function detect(): PushEnv {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // iPadOS meldet sich als Mac – erkennbar am Touchscreen
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const push = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { standalone, ios, push };
}

/**
 * Tisch6 als App auf dem Handy: installieren, Benachrichtigungen ein- und ausschalten, Probe-Nachricht.
 * token = persönlicher App-Schlüssel eines Gastes oder der Team-Schlüssel (Admin-App).
 * probe = Zusatzangaben für die Probe-Nachricht (z. B. { ziel: "admin" }).
 */
export function usePushApp({ token, vapidKey, texts, probe }: { token: string; vapidKey: string; texts: PushTexts; probe?: Record<string, string> }) {
  const [env, setEnv] = useState<PushEnv | null>(null);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    (async () => {
      const found = detect();
      setEnv(found);
      if (!found.push) return;
      setBlocked(Notification.permission === "denied");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      setSubscription(await registration.pushManager.getSubscription());
    })().catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function call(action: string, body: unknown = {}) {
    const res = await fetch(`/api/app/${token}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? texts.error);
  }

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await task());
    } catch (e) {
      setMessage(e instanceof Error && e.message ? e.message : texts.error);
    } finally {
      setBusy(false);
    }
  }

  const enable = () =>
    run(async () => {
      const registration = await navigator.serviceWorker.ready;
      let sub: PushSubscription;
      try {
        // fragt beim ersten Mal selbst nach der Erlaubnis
        sub =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }));
      } catch {
        if (Notification.permission === "denied") {
          setBlocked(true);
          return texts.pushBlocked;
        }
        throw new Error(texts.error);
      }
      await call("einschalten", sub.toJSON());
      setSubscription(sub);
      return texts.enabled;
    });

  const disable = () =>
    run(async () => {
      if (subscription) {
        await call("ausschalten", { endpoint: subscription.endpoint });
        await subscription.unsubscribe().catch(() => false);
      }
      setSubscription(null);
      return texts.disabled;
    });

  const test = () =>
    run(async () => {
      await call("probe", probe ?? {});
      return texts.testSent;
    });

  async function installNow() {
    if (!install) return;
    await install.prompt();
    setInstall(null);
  }

  return { env, canInstall: Boolean(install), installNow, subscription, blocked, busy, message, enable, disable, test };
}
