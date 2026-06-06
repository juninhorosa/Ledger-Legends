import React, { useState } from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { SHOP_ITEMS, ITEMS, rarityLabel } from "../../game/items";
import { useTonAddress, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { recordPurchase } from "../../lib/api";
import { toast } from "sonner";
import { Coins, Sparkles } from "lucide-react";

// Game treasury address - placeholder; replace with real one in production
const TREASURY_ADDRESS = "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9p";

// USDT Jetton master (mainnet)
// const USDT_MASTER = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";

export default function Shop() {
  const { t, lang } = useI18n();
  const state = useGame();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [busy, setBusy] = useState(null);

  const handleBuyGold = (s) => {
    if (state.gold < s.price_gold) { toast.error(t("insufficientFunds")); return; }
    state.buyShopItem(s, "GOLD");
    toast.success(t("purchaseSuccess"));
  };

  const handleBuyTon = async (s) => {
    if (!wallet) { toast.error(t("connectToBuy")); return; }
    try {
      setBusy(s.id + "-TON");
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: TREASURY_ADDRESS,
            amount: String(Math.floor(s.price_ton * 1e9)),
          },
        ],
      };
      const result = await tonConnectUI.sendTransaction(tx);
      // Record purchase in backend
      await recordPurchase(address, {
        wallet: address,
        item_id: s.item,
        currency: "TON",
        amount: s.price_ton,
        tx_hash: result?.boc?.slice(0, 32) || null,
      });
      state.buyShopItem(s, "TON");
      toast.success(t("purchaseSuccess"));
    } catch (e) {
      toast.error(t("purchaseFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="shop-panel" className="game-panel p-5 flex flex-col gap-3">
      <h2 className="panel-title text-lg flex items-center gap-2"><Sparkles size={16} className="text-cyan-400" /> {t("shop")}</h2>

      <div className="grid grid-cols-1 gap-3 max-h-[480px] overflow-y-auto pr-1">
        {SHOP_ITEMS.map((s) => {
          const it = ITEMS[s.item];
          return (
            <div key={s.id} className={`item-slot p-3 rarity-${it.rarity}`}>
              <div className={`font-heading text-base text-rarity-${it.rarity}`}>{it.name[lang]}</div>
              <div className="text-[10px] text-slate-400 mb-1">{rarityLabel(it.rarity, lang)} · {t(it.slot)}</div>
              <div className="text-xs text-slate-300 font-mono-num mb-2">
                {Object.entries(it.stats).map(([k, v]) => (<span key={k} className="mr-2">+{v} {k.toUpperCase()}</span>))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  data-testid={`shop-buy-gold-${s.id}`}
                  onClick={() => handleBuyGold(s)}
                  className="btn-epic text-xs py-1 px-2 flex items-center gap-1"
                >
                  <Coins size={12} /> {s.price_gold.toLocaleString()}
                </button>
                <button
                  data-testid={`shop-buy-ton-${s.id}`}
                  onClick={() => handleBuyTon(s)}
                  disabled={busy === s.id + "-TON"}
                  className="btn-ton text-xs py-1 px-2"
                >
                  {busy === s.id + "-TON" ? "..." : `TON ${s.price_ton}`}
                </button>
                <span className="px-2 py-1 text-xs text-emerald-300 border border-emerald-700 rounded font-mono-num">
                  USDT {s.price_usdt}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
