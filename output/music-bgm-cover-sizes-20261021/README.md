# 开智小曲封面：4:3 与 3:4

- 横封面：开智小曲-横封面-4x3.png，1440×1080。
- 竖封面：开智小曲-竖封面-3x4.png，1080×1440。

沿用原版 Canvas 的角色、配色、字体、文案及实测低音数据，分别重排为左文右图、上下构图。原设计与角色画法来自 Opus 5.5 本片封面；尺寸与布局适配由 Codex 完成。没有改动原9:16图片或影片。

已查看完整图片与180像素宽缩略图；两版各13个文本框均在画布内，两套本地字库加载成功，比例与PNG文件校验通过。检查是本地图片预览，不代表已经在抖音真机页面测试。

## 重新渲染

在本目录运行，需要本机Node.js与Google Chrome，无需安装新的npm包：

```sh
node tools/render.mjs cover-src/index-4x3.html stills out 0:开智小曲-横封面-4x3 --png --width 1440 --height 1080
node tools/render.mjs cover-src/index-3x4.html stills out 0:开智小曲-竖封面-3x4 --png --width 1080 --height 1440
```

字体和低音数据随可编辑源保留。cover-src/index.html和cover-original-9x16.js是原9:16基线，新增两版使用index-4x3.html/index-3x4.html和cover.js。
