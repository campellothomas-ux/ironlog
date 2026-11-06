import { defineConfig } from '@playwright/test';
// System Chromium is an explicit local fallback, never represented as Safari.
const chromium=process.env.IRONLOG_CHROMIUM_PATH;
const sizes=[[375,667],[390,844],[393,852],[430,932],[1280,900]];
export default defineConfig({
 testDir:'tests/e2e',workers:2,
 use:{baseURL:'http://127.0.0.1:4173',timezoneId:'Europe/Paris',screenshot:'only-on-failure'},
 projects:sizes.map(([width,height])=>({name:`${chromium?'chromium':'webkit'}-${width}`,use:{browserName:chromium?'chromium' as const:'webkit' as const,launchOptions:chromium?{executablePath:chromium}:undefined,viewport:{width,height},isMobile:width<850,hasTouch:width<850}})),
 webServer:{command:'npm run dev -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false}
});
