// Telegram WebApp helpers
export function getTelegram() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp || null;
}

export function isTelegram() {
  const tg = getTelegram();
  return !!(tg && tg.initData && tg.initData.length > 0);
}

export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
    // Force dark theme to match game aesthetic
    tg.setHeaderColor && tg.setHeaderColor("#0B0F19");
    tg.setBackgroundColor && tg.setBackgroundColor("#0B0F19");
  } catch (_) {}
  return tg;
}

export function getInitData() {
  const tg = getTelegram();
  return tg?.initData || "";
}

export function getTelegramUser() {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.user || null;
}

export function hapticImpact(style = "medium") {
  const tg = getTelegram();
  try {
    tg?.HapticFeedback?.impactOccurred(style);
  } catch (_) {}
}

export function hapticNotify(type = "success") {
  const tg = getTelegram();
  try {
    tg?.HapticFeedback?.notificationOccurred(type);
  } catch (_) {}
}
