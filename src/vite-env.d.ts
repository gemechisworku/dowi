/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** The app version string, injected at build time from package.json (vite.config.ts `define`). Read by Settings → About. */
declare const __APP_VERSION__: string

/** VAPID public key for Web Push, injected at build time from the VAPID_PUBLIC_KEY env var (vite.config.ts `define`) — empty string when push isn't configured. */
declare const __VAPID_PUBLIC_KEY__: string
