import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { mobileApplication } from "./runtime.ts";
import type { MobileApplication } from "./application.ts";

const ApplicationContext = createContext<MobileApplication>(mobileApplication);
export function AppProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void mobileApplication.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && mobileApplication.getState().auth === "ready") {
        void mobileApplication
          .ensureSession()
          .then(() => mobileApplication.reconcileOutstanding(true))
          .catch((error) => mobileApplication.report(error));
      }
    });
    const interval = setInterval(() => {
      if (
        AppState.currentState !== "active" ||
        mobileApplication.getState().auth !== "ready"
      )
        return;
      void mobileApplication
        .ensureSession()
        .then(() => mobileApplication.reconcileOutstanding())
        .catch((error) => mobileApplication.report(error));
    }, 5000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
  return (
    <ApplicationContext.Provider value={mobileApplication}>
      {children}
    </ApplicationContext.Provider>
  );
}
export function useApplication() {
  const app = useContext(ApplicationContext);
  const state = useSyncExternalStore(app.subscribe, app.getState, app.getState);
  return { app, state };
}
