import React, { useEffect, useState } from "react";
import { useTonAddress, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { Wallet as WalletIcon, LogOut, Copy, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { toast } from "sonner";
import { useGame } from "../../store/gameStore";
import { getBalance } from "../../lib/api";
import DepositDialog from "./DepositDialog";
import WithdrawDialog from "./WithdrawDialog";

export default function WalletPanel() {
  const { t } = useI18n();
  const wallet = useTonWallet();
  const userFriendlyAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [balance, setBalance] = useState({ ton: 0, usdt: 0 });
  const [inGame, setInGame] = useState({ ton_balance: 0, vip_level: 0 });
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const playerWallet = useGame((s) => s.wallet);

  // On-chain wallet TON balance (public TON Center read)
  useEffect(() => {
    if (!userFriendlyAddress) return;
    const fetchBalance = async () => {
      try {
        const url = `https://toncenter.com/api/v2/getAddressBalance?address=${userFriendlyAddress}`;
        const r = await fetch(url);
        const j = await r.json();
        if (j.ok && j.result) {
          setBalance((b) => ({ ...b, ton: Number(j.result) / 1e9 }));
        }
      } catch (e) {
        /* silent */
      }
    };
    fetchBalance();
    const id = setInterval(fetchBalance, 30000);
    return () => clearInterval(id);
  }, [userFriendlyAddress]);

  // In-game internal balance (treasury credited)
  useEffect(() => {
    if (!playerWallet) return;
    const fetchInGame = async () => {
      try {
        const b = await getBalance(playerWallet);
        setInGame(b);
      } catch (e) {
        /* silent */
      }
    };
    fetchInGame();
    const id = setInterval(fetchInGame, 15000);
    return () => clearInterval(id);
  }, [playerWallet, depositOpen]);

  const handleConnect = async () => {
    try {
      await tonConnectUI.openModal();
    } catch (e) {
      toast.error("Failed to open wallet modal");
    }
  };

  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
    } catch {
      /* ignore */
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(userFriendlyAddress);
    toast.success("Address copied");
  };

  const openDeposit = () => {
    if (!wallet) {
      toast.error(t("connectWalletFirst"));
      return;
    }
    setDepositOpen(true);
  };

  const openWithdraw = () => {
    if (!playerWallet) {
      toast.error(t("connectWalletFirst"));
      return;
    }
    setWithdrawOpen(true);
  };

  if (!wallet) {
    return (
      <button
        data-testid="wallet-connect-button"
        onClick={handleConnect}
        className="btn-ton flex items-center gap-2"
      >
        <WalletIcon size={16} /> {t("connectWallet")}
      </button>
    );
  }

  const short = userFriendlyAddress
    ? `${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}`
    : "";

  return (
    <>
      <div data-testid="wallet-panel" className="flex items-center gap-3 game-panel px-4 py-2">
        <div className="flex flex-col font-mono-num text-xs">
          <span className="text-cyan-400" data-testid="balance-ton">
            TON {balance.ton.toFixed(3)}
          </span>
          <span
            className="text-emerald-400"
            data-testid="balance-in-game"
            title="In-game balance"
          >
            ⚜ {Number(inGame.ton_balance || 0).toFixed(3)}
            {inGame.vip_level > 0 && (
              <span className="ml-1 text-amber-300">VIP{inGame.vip_level}</span>
            )}
          </span>
        </div>
        <button
          data-testid="wallet-deposit-button"
          onClick={openDeposit}
          className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200"
          title={t("depositTon")}
        >
          <ArrowDownToLine size={12} /> {t("deposit")}
        </button>
        <button
          data-testid="wallet-withdraw-button"
          onClick={openWithdraw}
          className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200"
          title={t("withdrawTon")}
        >
          <ArrowUpFromLine size={12} /> {t("withdraw")}
        </button>
        <button
          data-testid="wallet-copy-address"
          onClick={copyAddress}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-amber-300 font-mono-num"
          title={userFriendlyAddress}
        >
          {short} <Copy size={12} />
        </button>
        <button
          data-testid="wallet-disconnect-button"
          onClick={handleDisconnect}
          className="text-slate-400 hover:text-red-400"
          title={t("disconnect")}
        >
          <LogOut size={16} />
        </button>
      </div>
      <DepositDialog
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        wallet={playerWallet || userFriendlyAddress}
      />
      <WithdrawDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        wallet={playerWallet || userFriendlyAddress}
      />
    </>
  );
}
