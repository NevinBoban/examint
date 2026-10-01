import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const Context = createContext({
  installAvailable: false,
  installed: false,
  offlineReady: false,
  needRefresh: false,
  install: async () => {},
  update: () => {},
});
export const usePWA = () => useContext(Context);
export function PWAProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(
      window.matchMedia("(display-mode: standalone)").matches,
    );
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const capture = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  async function install() {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    }
  }
  return (
    <Context.Provider
      value={{
        installAvailable: !!prompt,
        installed,
        offlineReady,
        needRefresh,
        install,
        update: () => {
          void updateServiceWorker(true);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
