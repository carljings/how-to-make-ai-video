import { defineConfig } from "vite";

// 部署在 https://carljings.top/cube/ ，所有资源同站发布（不依赖外部 CDN）
export default defineConfig({
  base: "/cube/",
  build: {
    target: "es2020",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    // 不注入依赖 document 的预加载辅助代码（cubing.js 的 Worker 会复用共享模块）
    modulePreload: false,
    // 所有样式提取到一个 CSS 文件、由 HTML 直接链接，动态模块不再带 CSS 依赖
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // cubing.js 的打乱生成 Worker 会加载它与页面共享的模块。把这些共享模块单独成块，
        // 避免 Worker 加载到页面代码（页面代码依赖 document/window）。按需加载的谜题与搜索块保持独立。
        manualChunks(id) {
          const m = id.replace(/\\/g, "/");
          if (m.includes("/node_modules/cubing/dist/lib/cubing/")) {
            if (/\/chunks\/(search-dynamic|puzzles-dynamic|twips|inside|search-worker-entry|big-puzzle|twisty)/.test(m)) return undefined;
            return "cubing-core";
          }
          if (m.includes("/node_modules/three/")) return "three";
          return undefined;
        },
      },
    },
  },
  worker: { format: "es" },
});
