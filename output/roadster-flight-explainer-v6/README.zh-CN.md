# Roadster v6《空气现形》· 文字讲解版

> 2026-10-18后续科学核查：本版保留为旧稿。此前画面/编码检查不等于实车内部结构验证；吸附措辞、具体风扇/储罐布局、漏气与运动表述正在v7修正。详见[科学与结构核查](../../docs/zh-CN/roadster-science-audit-2026-10-18.md)。

已完成独立v6：54.1秒，1080×1920，30fps，1623帧。无任何语言口播，保留原创程序配乐和音效。Opus5.5(max)主导导演方案与代码；Codex负责本机渲染和实际检查。

[完整MP4（原文件未收录，见归档状态）](../archive-20261025/README.zh-CN.md) · [检查记录](QA.md) · [英文协作](CLAUDE_COLLABORATION.md) · [标题标签](PUBLISH.zh-CN.md)

第0帧即倒悬车与“它凭什么不掉？”；用15组大字短句配合压力、气流、喷气和翻转讲解，按文字阅读时间安排镜头及音效。用金色区分外界压力、青色区分车载气体，保留气体有限的结尾。

完整解码、46张编码后画面、字体覆盖、文字阅读/布局和响度检查通过；最终编码−14.1LUFS/−2.1dBTP。未人工试听或真实手机连续观看，不宣称用户审美认可。

交付目录包含完整MP4、两版封面、屏幕文字清单、发布草稿、验证JSON与实际编码后画面。导演方案见`TREATMENT.en.md`、`storyboard.zh-CN.md`；唯一时间源为`web/engine/cues.js`，供画面、文字与配乐共同使用。制作记录见`production-log.md`。

车与轨道沿用原片推断拟合，有限平顶保留；内部器件、粒子、气流与受力是示意，非官方CAD/CFD/性能数据。翻转属于另一场演示，原片细线保留并注明作用未公开；来源日期2026-10-16。

v1–v5保留，v5原成片哈希已核对未变。本轮未Git推送或发布。复现命令保存在`out/full-render-01/command.json`与`out/delivery-v6/encode-command.json`；音频与文字检查使用`tools/score.mjs`、`tools/mix.mjs`和`tools/text_inventory.mjs`。
