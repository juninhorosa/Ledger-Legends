import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n/I18nContext";
import GamePanel from "@/components/game/GamePanel";
import "@/App.css";

const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

function App() {
  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<GamePanel />} />
            <Route path="*" element={<GamePanel />} />
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors />
      </I18nProvider>
    </TonConnectUIProvider>
  );
}

export default App;
