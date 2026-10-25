# Hypit源码学习与本轮视频应用

核对日期：2026-10-18。官方仓库：[hypit-ai/hypit](https://github.com/hypit-ai/hypit)。本地研读快照：`dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0`，package版本`0.3.1`。

## 项目定位与核查范围

Hypit为Agent提供视频创作语言、编译与执行系统，把素材、字幕、动效和声音组织为可编辑工作流。生成模型是可选材料来源；代码图形、字幕与程序动画也可直接合成。框架费用与Agent、模型服务费用需要分别看待。[官方说明](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/README.md)

本次已核对仓库归属、许可、包入口、语义时间规范、动效规范和完整代码示例。研究副本位于`.omx/reference-repos/hypit`。没有全局安装其Skill/CLI，没有接入推荐云服务；也没有把作者的宣传播放量或示例成本当成实测结果。

## 源码与示例里值得借鉴的内容

| 能力 | 核对依据 | 对科普视频的用途 |
|---|---|---|
| 语义时间 | Script区分文字、发音、Selection和Moment；图形与声音响应具体语义事件 | 讲到关键因果时，让镜头、动作、字幕和声音一起完成转折 |
| 自定义场景 | semantic-composition中的`renderExplainer`用同一场景协调视频视口与说明图 | 一个对象移动、放大、剖开或改变布局时，观众仍能跟住同一个解释对象 |
| 代码动画 | `chat.svml`用有限Timeline和自定义组件组织纯程序动画 | 可先用本地代码验证创意与节奏，不必先购买生成素材 |
| 职责分开 | Compiler与RunCompiler分别暴露创作源与执行计划入口 | 旁白、素材与渲染配置变化时，更容易只重做需要变动的部分 |
| 动效指导 | 项目要求关注变化后的状态、对象连续性和运动意义 | 特效需要推进解释和情绪，出场动画只是其中一环 |

依据：[语义时间](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/skills/hypit/references/creation/script-and-time.md)、[场景代码](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/examples/semantic-composition/packages/responsive-explainer/src/render.ts)、[纯动画示例](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/examples/semantic-composition/chat.svml)、[编译入口](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/packages/compiler/src/index.ts)、[动效规范](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/skills/hypit/references/playbooks/craft/motion-graphics.md)。

上述是源码和示例研读结论；尚未执行Hypit的完整示例渲染，不据此宣称它比现有工具画质更好、速度更快或成本更低。

复用时还有一个具体版本细节：该示例README描述公共`@hypit/hypit/*`导入，而当前`render.ts`与`package.json`使用`@hypit/composition`等workspace依赖。独立拷贝示例时需要配套处理实际依赖与导出，不能直接视为已验证的一键模板。[示例依赖](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/examples/semantic-composition/packages/responsive-explainer/package.json)

## 应用于Roadster v5

用户已明确指出v4特效不够酷、缺少吸引力，并授权Opus自由发挥。v5不锁定旧版光切、黑底配色、分镜、旁白、时长和渲染器。Hypit提供创作方法与代码参考，具体导演方案由Opus决定。

先制作一段包含开场与实质解释转变的连续动态样片，使用真实配音、字幕和声音验证吸引力；达到明显不同于v4的观看体验后再完成全片。验收同时看画面、节奏、因果是否清楚，以及车辆、顶部直板和动作是否尊重原片。代码通过和用户审美认可分别记录。

新项目：`output/roadster-flight-explainer-v5`。实际英文协作记录将随制作保存在该目录。旧版独立保留。

## 许可记录

仓库LICENSE标注为附加条件的Apache2.0修改版本，条款区分自用、输出内容与多租户/商业再分发等用途。需要评估后两类用途时，应直接查阅当前原文。[LICENSE](https://github.com/hypit-ai/hypit/blob/dc2b7a8f31b1ef1443a79ca448548d69e3ceb6a0/LICENSE)

## 本轮实际交付

Opus5.5已按其自由导演方案完成v5《空气现形》：56.4秒、1080×1920、30fps。实际工具为自编WebGL2引擎、ChromeMetal、本机FFmpeg和真实逐句配音；Hypit方法用于创作参考。全片完整解码、44张编码后画面与响度检查通过；未进行人工试听或真实手机连续观看，不把技术检查等同于用户审美认可。

[成片与记录](../../output/roadster-flight-explainer-v5/README.zh-CN.md) · [实际英文协作](../../output/roadster-flight-explainer-v5/CLAUDE_COLLABORATION.md)。v1–v4保留。
