# v7 QA / 实际检查记录

完成日期2026-10-18。实际成片：`out/delivery-v7/roadster-v7-science-quiet.mp4`；115275911 bytes；SHA256 `068adb8a605a64b2d821b4c6a3ffc61bd54382da51ed2862b3b55d9ea51347ac`。

## 画面与音轨

- 1080×1920，30fps，1770帧，视频/音频均59.0秒；H.264 High/BT.709 + AAC256k/48kHz/stereo。
- 完整ffmpeg解码退出0；最终AAC测得−20.0LUFS/−7.3dBTP。原生Metal/8subframes/48volume steps全帧渲染754.0秒。
- 先实际查看53张原生画面，随后12张修正画面；最终查看59张编码后画面（7张contact，缩图宽360px）。
- 16组解释卡、3组功能图、57条屏幕文字、158个去空格字符通过字体、阅读、布局和碰撞检查。阅读规则是本片启发式，不是观众理解率实测。
- 源web/renderer29文件渲染前后与最终交付时哈希不变；见source-lock.json与PICTURE_LOCK.json。

## 科学与结构检查

查阅Tesla官网公开描述、USPTO第1项权利要求、NASA推进/COPV一般资料、OpenStax力学与压强资料，并核对本地已留存发布记录。原始X细节403、GooglePatents全文未取得、原始网页另存SSL失败等访问限制已在研究报告中如实记录。

现片修正：吸附就是压差机制；风扇与密封维持低压且气体尚在；具体双风扇/双储罐内部布置移除，替换为独立功能示意；压差作用与轮胎支持力、重力分色分开；密封破坏后吸附逐渐减弱；向上推力不等于向上运动；推力作用线/重心/转矩作一般机制示意；多股力的合转矩影响实际转动；储气有限需补充。保留分场与细线作用未知说明。

本机像素检查另外发现并修正了E2排气轨迹的速度记账问题（示意镜头采用随车短时近似，排气明确向下），以及P3上无关的缆线指示线穿过转矩图的问题。P1标签从含混的“非真空”改为“低压区·有空气”。

**边界**：外观、轨道与姿态是画面拟合；内部功能图不是实车布局。没有获得厂商完整CAD/BOM、校准的质量/惯量/压力/推力/气路/结构试验数据，不能声称真实车辆全套结构、控制和动力学已经独立验证。静态方程和7组归一化反例仅用于检查逻辑，不是Tesla性能测试。夜景E3/F1烟雾仍是视觉拟合，不是CFD或粒子动力学验证。

## 音乐反馈落实

旧v6的程序噪声/密集节拍已替换为D大调柔和音垫、5音动机和6处柔和低音提示。无语音/TTS、旧混音、噪声发生器、压低音乐逻辑、压缩器或限制器；四轨经单一增益混成母带。母带59.0秒/2832000samples，SHA256 `e4f807b625265e1cbc185dfb28c7e002e49c7c24c2f23ecb586d93f7db5bbc86`。

整体响度相对旧版母带降低约6LU。另做了实际本地母带的Hann32768/50%overlap频谱对比，见audio-comparison.json；新轨高频能量和相邻采样变化显著降低。两首配乐时长与内容不同，这不是主观听感评分，不声称已人工试听。

## 已知、接受的非阻塞限制

D2最初约0.5秒的转场中，非比例箭头说明稍后出现；画面一直标“原理示意”，没有标实测力值。源冻结后未为这个短暂注释过渡重渲；其余主要受力镜头说明在场。C05轻压文字缓慢漂入；若干卡片阅读时间贴近预设规则下限。片尾来源小字还在开头/分隔处重复呈现。

未进行人工音乐试听或真实手机连续观看；不声称用户审美认可或百万播放保证。旧版视频保留，未Git推送或代发。

## English

Complete1770frame decode passed;59actual encoded frames viewed. Native render754.0s;finalAAC−20.0LUFS/−7.3dBTP. All16cards/3plates andfont/layoutchecks pass. Sourcefreeze matches. The22claim science/structure audit and later terminology/advection corrections are applied to explicitly illustrative claims. No factory/as-built vehicle certification or solved dynamics is claimed. Quietmusic is newlycomposed,not attenuated oldnoise. Subjective listening,real-phone continuous playback and human aesthetic acceptance remain unverified. SeeSCIENCE_AUDIT.en.md/zh-CN.md andFULL_READY.md for evidence and limits.
