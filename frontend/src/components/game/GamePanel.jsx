import React, { useEffect, useState } from "react";
import { useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { fetchPlayer, api } from "../../lib/api";
import { initTelegram, isTelegram, getInitData, getTelegramUser } from "../../lib/telegram";
import CharacterPanel from "./CharacterPanel";
import CombatScreen from "./CombatScreen";
import InventoryPanel from "./InventoryPanel";
import TalentTree from "./TalentTree";
import Crafting from "./Crafting";
import SeasonPass from "./SeasonPass";
import Shop from "./Shop";
import EconomyShop from "./EconomyShop";
import WalletPanel from "../wallet/WalletPanel";
import { Globe2, Save, Sword, Backpack, Hammer, Star, Sparkles, Calendar, Coins } from "lucide-react";

const TABS = [
  { id: "inventory", icon: Backpack, key: "inventory" },
  { id: "shop", icon: Sparkles, key: "shop" },
  { id: "economy", icon: Coins, key: "economy" },
  { id: "crafting", icon: Hammer, key: "crafting" },
  { id: "talents", icon: Star, key: "talents" },
  { id: "season", icon: Calendar, key: "seasonPass" },
];

export default function GamePanel() {
  const { t, lang, setLanguage } = useI18n();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const game = useGame();
  const [activeTab, setActiveTab] = useState("inventory");
  const [loaded, setLoaded] = useState(false);
  const [tgMode, setTgMode] = useState(false);
  const [tgUser, setTgUser] = useState(null);

  // Telegram Mini App auto-auth on mount
  useEffect(() => {
    const tg = initTelegram();
    // Detect ref param from URL or Telegram startParam
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get("ref");
    const refFromTg = tg?.initDataUnsafe?.start_param?.replace(/^ref_/, "");
    const refId = refFromUrl || refFromTg;
    const referredBy = refId ? parseInt(refId, 10) : null;

    if (tg && isTelegram()) {
      setTgMode(true);
      const user = getTelegramUser();
      setTgUser(user);
      (async () => {
        try {
          const r = await api.post("/telegram/auth", {
            init_data: getInitData(),
            referred_by: referredBy,
          });
          const data = r.data;
          game.hydrateFromServer({ ...data.player, wallet: data.wallet });
          if (data.referral_bonus_granted) {
            // Welcome with bonus
            setTimeout(() => {
              import("sonner").then(({ toast }) => toast.success("🎁 Referral bonus: +200 gold & Rune Blade!"));
            }, 800);
          }
          setLoaded(true);
        } catch (e) {
          game.setWallet(`tg:guest`);
          game.initRun();
          setLoaded(true);
        }
      })();
      return;
    }
    // Dev / preview mode: ?guest=1 enables play without wallet
    if (params.get("guest") === "1") {
      setTgMode(true);
      setTgUser({ first_name: "Guest", username: "guest" });
      game.setWallet("guest:local");
      game.initRun();
      setLoaded(true);
    }
  }, []);

  // Load player from backend when TON wallet connects (desktop browser flow)
  useEffect(() => {
    if (tgMode) return;
    let cancelled = false;
    const load = async () => {
      if (!address) { setLoaded(false); return; }
      try {
        const data = await fetchPlayer(address);
        if (!cancelled) {
          game.hydrateFromServer(data);
          setLoaded(true);
        }
      } catch (e) {
        game.setWallet(address);
        game.initRun();
        setLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [address, tgMode]);

  // Auto-save every 15s
  useEffect(() => {
    if (!game.wallet) return;
    const id = setInterval(() => { useGame.getState().saveToServer(); }, 15000);
    return () => clearInterval(id);
  }, [game.wallet]);

  if (!tgMode && !wallet) {
    return <Landing />;
  }

  return (
    <div className="min-h-screen p-4 lg:p-6">
      {/* Header */}
      <header className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl text-amber-300 tracking-wider" data-testid="game-title">{t("title")}</h1>
          <p className="text-xs lg:text-sm text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="lang-toggle"
            onClick={() => setLanguage(lang === "en" ? "pt" : "en")}
            className="tab-pill flex items-center gap-1"
          >
            <Globe2 size={14} /> {lang.toUpperCase()}
          </button>
          <button
            data-testid="save-button"
            onClick={() => game.saveToServer()}
            className="tab-pill flex items-center gap-1"
            title={game.saving ? t("autoSaving") : t("saved")}
          >
            <Save size={14} /> {game.saving ? t("autoSaving") : t("saved")}
          </button>
          {tgMode ? (
            <div className="game-panel px-3 py-2 flex items-center gap-2 text-xs" data-testid="telegram-user-badge">
              <span className="text-cyan-400 font-mono-num">@{tgUser?.username || tgUser?.first_name || "player"}</span>
              <WalletPanel />
            </div>
          ) : (
            <WalletPanel />
          )}
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-3 order-2 lg:order-1">
          <CharacterPanel />
        </div>
        <div className="lg:col-span-6 order-1 lg:order-2">
          <CombatScreen />
        </div>
        <div className="lg:col-span-3 order-3 flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-pill flex items-center gap-1 ${activeTab === tab.id ? "active" : ""}`}
                >
                  <Icon size={12} /> {t(tab.key)}
                </button>
              );
            })}
          </div>

          {activeTab === "inventory" && <InventoryPanel />}
          {activeTab === "shop" && <Shop />}
          {activeTab === "economy" && <EconomyShop />}
          {activeTab === "crafting" && <Crafting />}
          {activeTab === "talents" && <TalentTree />}
          {activeTab === "season" && <SeasonPass />}
        </div>
      </div>
    </div>
  );
}

function Landing() {
  const { t, lang, setLanguage } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="game-panel max-w-2xl w-full p-10 text-center" data-testid="landing-panel">
        <div className="absolute top-4 right-4">
          <button
            data-testid="landing-lang-toggle"
            onClick={() => setLanguage(lang === "en" ? "pt" : "en")}
            className="tab-pill flex items-center gap-1"
          >
            <Globe2 size={14} /> {lang.toUpperCase()}
          </button>
        </div>
        <h1 className="font-heading text-5xl text-amber-300 tracking-wider mb-2" style={{ textShadow: "0 0 20px rgba(252, 211, 77, 0.4)" }}>
          {t("title")}
        </h1>
        <p className="text-slate-400 mb-6">{t("subtitle")}</p>
        <img
          src="https://images.unsplash.com/photo-1773216344064-e1231ff27d09?w=400&q=70"
          alt="hero"
          className="w-40 h-40 mx-auto rounded-full border-4 border-amber-700 shadow-[0_0_40px_rgba(217,119,6,0.6)] mb-6 object-cover"
        />
        <p className="text-slate-300 mb-6">{t("connectPrompt")}</p>
        <div className="flex justify-center">
          <WalletPanel />
        </div>
      </div>
    </div>
  );
}
