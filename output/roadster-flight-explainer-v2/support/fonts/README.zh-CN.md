# v2 字体支持

本次 v2 字体为 **Roadster Film Sans 300 / 600 / 900**，由本地已有的官方 Noto Sans SC 可变字体生成真实静态字重，提供 TTF、WOFF2 两种格式。本目录和 `public/fonts/roadster/` 均有六个新资源。复制来的旧版 500/700 字重保持原样；旧 `fonts.css` 未修改，v2 的字体加载和视觉样式由 Opus 负责。

`subset-characters.txt` 共 **521 个码位，其中 404 个汉字**，覆盖完整的 v2 `CREATIVE_DIRECTION.en.md`、`storyboard-v2.zh-CN.md` 中所有可打印字符，以及可打印 ASCII。生成时尚无新的 `v2/cues.json` 或 `src/v2` 提示/规格 JSON；这些文件到达后应再次核对新增文字。扩大字形覆盖不代表新增获批屏幕文字。

六个资源均通过检查：cmap 完整覆盖、实际 OS/2 字重分别为 300/600/900、已移除 `fvar` 可变轴、WOFF2 可重新打开。使用 Pillow/FreeType 对三种字重的全部非空格字符实际栅格化，未发现空字形或缺字方框；解压后的 WOFF2 与对应 TTF 的栅格结果逐字相同。已查看 `font-raster-proof.png`，连续两次生成的哈希一致。这些检查只验证字体资源，不代表成片字幕已通过阅读或审美验收。

`coverage.json` 记录文件大小、真实字重与 SHA-256；`provenance.json` 记录官方来源、许可、本地源字体哈希和审核文档哈希。已附 SIL Open Font License。此次未联网、安装软件、修改 v1 或上传远程服务器。

以下命令已在仓库根目录使用现有 Python/fontTools 执行：

```sh
python3 output/roadster-flight-explainer-v2/support/fonts/build-subset.py .omx/artifacts/roadster-production-20261016/font-support/NotoSansSC-full-variable.ttf
```

文件名分别为 `RoadsterFilmSans-300`、`RoadsterFilmSans-600`、`RoadsterFilmSans-900`，字体家族名称为 `Roadster Film Sans`。完整源 TTF 继续保留为内部依赖，交付目录不重复保存约 17.8 MB 的完整字体。
