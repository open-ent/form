import "@open-ent/bootstrap/dist/index.css";
import "react-toastify/dist/ReactToastify.css";

import { ThemeProvider as ThemeProviderCGI, ThemeProviderProps } from "@cgi-learning-hub/theme";
import { GlobalStyles } from "@cgi-learning-hub/ui";
import { ERROR_CODE } from "@open-ent/client";
import { EdificeClientProvider, EdificeThemeProvider } from "@open-ent/react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { DEFAULT_THEME, FORMULAIRE_PUBLIC, TOAST_CONFIG } from "./core/constants";
import { globalOverrideStyles } from "./core/style/global";
import { getOptions } from "./core/style/theme";
import { useTheme } from "./hook/useTheme";
import { GlobalProvider } from "./providers/GlobalProvider";
import { router } from "./routes";
import { store } from "./store";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}
const root = createRoot(rootElement);

// Config

const themePlatform = (rootElement.getAttribute("data-theme") ?? DEFAULT_THEME) as ThemeProviderProps["themeId"];

if (process.env.NODE_ENV !== "production") {
  void import("@axe-core/react").then((axe) => {
    void axe.default(React, root, 1000);
  });
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (typeof error === "string") {
        if (error === ERROR_CODE.NOT_LOGGED_IN) {
          if (!window.location.pathname.includes("formulaire-public")) {
            window.location.replace("/auth/login");
            return;
          }
        }
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const { isTheme1D } = useTheme();

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main || (main.classList.contains("theme-1d") && isTheme1D)) return;
    if (isTheme1D) main.classList.add("theme-1d");
    else main.classList.remove("theme-1d");
  }, [isTheme1D]);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <EdificeClientProvider
          params={{
            app: FORMULAIRE_PUBLIC,
          }}
        >
          <EdificeThemeProvider>
            <ThemeProviderCGI
              themeId={isTheme1D ? "ent1D" : themePlatform ?? "default"}
              options={getOptions(isTheme1D)}
            >
              <GlobalProvider>
                <GlobalStyles styles={globalOverrideStyles} />
                <ToastContainer {...TOAST_CONFIG} />
                <RouterProvider router={router} />
              </GlobalProvider>
            </ThemeProviderCGI>
          </EdificeThemeProvider>
        </EdificeClientProvider>
      </Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

root.render(<App />);
