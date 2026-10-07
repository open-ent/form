import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  // Checking environement files
  const envFile = loadEnv(mode, process.cwd());
  const envs = { ...process.env, ...envFile };
  const hasEnvFile = Object.keys(envFile).length;

  // Proxy variables
  const headers = hasEnvFile
      ? {
        "set-cookie": [
          `oneSessionId=${envs.VITE_ONE_SESSION_ID}`,
          `XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        ],
        "Cache-Control": "public, max-age=300",
      }
      : {};

  const proxyObj = hasEnvFile
      ? {
        target: envs.VITE_RECETTE,
        changeOrigin: true,
        headers: {
          cookie: `oneSessionId=${envs.VITE_ONE_SESSION_ID};authenticated=true; XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        },
      }
      : {
        target: envs.VITE_LOCALHOST || "http://localhost:8090",
        changeOrigin: false,
      };

  const proxy = {
    "/applications-list": proxyObj,
    "/conf/public": proxyObj,
    "^/(?=help-1d|help-2d)": proxyObj,
    "^/(?=assets)": proxyObj,
    "^/(?=theme|locale|i18n|skin)": proxyObj,
    "^/(?=auth|appregistry|archive|cas|userbook|directory|communication|conversation|portal|session|timeline|workspace|infra)":
    proxyObj,
    "/blog": proxyObj,
    "/explorer": proxyObj,
    "/formulaire-public": proxyObj,
  };

  const base = mode === "production" ? "/formulaire-public" : "";

  const build = {
    assetsDir: "public",
    rollupOptions: {
      output: {
        manualChunks: {
          react: [
            "react",
            "react-router-dom",
            "react-dom",
            "react-error-boundary",
            "react-hook-form",
            "react-hot-toast",
          ],
        },
      },
    },
  };

  const plugins = [react(), tsconfigPaths()];

  const server = {
    proxy,
    host: "0.0.0.0",
    port: 4200,
    headers,
    open: true,
    strictPort: true,
    fs: {
      allow: ["../../"],
    },
  };

  const test = {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/tests/setup.ts",
    server: {
      deps: {
        inline: ["@open-ent/react"],
      },
    },
  };

  const optimizeDeps = {
    include: ["@cgi-learning-hub/ui", "@cgi-learning-hub/theme"],
  };

  return defineConfig({
    base,
    build,
    plugins,
    server,
    test,
    optimizeDeps,
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "@tanstack/react-query",
        "react-i18next",
        "i18next",
        "@open-ent/client",
        "@open-ent/react",
        "@open-ent/bootstrap",
      ],
      alias: {
        "@cgi-learning-hub": resolve(__dirname, "node_modules/@cgi-learning-hub",),
        "@images": resolve(__dirname, "node_modules/@open-ent/bootstrap/dist/images",),
        "@common": resolve(__dirname, "../../common/src/main/resources/ts/*",),
      },
    },
  });
};
