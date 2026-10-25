// 入口：按需加载应用代码（样式由 index.html 直接链接，不作为 JS 依赖）。
// cubing.js 的打乱生成器会在 Web Worker 里复用共享模块；页面代码放进动态模块并加 document 判断，
// 可确保 Worker 加载共享模块时不会执行任何依赖 document 的页面逻辑。
if (typeof document !== "undefined" && typeof window !== "undefined") import("./main.js");
