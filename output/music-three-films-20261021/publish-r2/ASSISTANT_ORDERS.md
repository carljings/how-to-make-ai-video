# ASSISTANT_ORDERS — 《一听就想点头？秘密在低音里》（C-long r2）发布素材交付（Opus 5.5 → Codex，只做机械执行）

状态：**已定稿**（Opus 5.5 · claude-opus-5-5 / max，2026-10-21）。封面、标题、标签、作品介绍（精简版＋长版）都由我定稿；封面 PNG 是我渲染并亲自审图后放行的（见 `封面审图.md`）。
注意：服务器上 `/dev/shm/pdx/publish-r3/`（《AI也会刷分》封面草稿）已按用户纠正停止，**不要**交付、不要拷到桌面、也不要删除。

规则：只按下列命令逐条执行。不改任何文件内容、不重新出图、不重编码视频、不改名（除第 4 步指定的名字）、不删除任何已有文件、不覆盖同名文件。任何一步结果与预期不符：停下，原样回报输出，不自行补救。不发布、不 git 推送、不付费生成、不写永久记忆。

## 0. 服务器上的交付物（只读）
目录：`/dev/shm/pdx/deliver-music-publish/`（内存盘；取回完成前不要重启服务器）

| 文件 | 字节 | sha256 |
|---|---|---|
| `开智小曲-封面-1080x1920.png`（封面，1080×1920） | 1,901,684 | `e60705da12564023712c9a388f6042bd496feafe9c23e8756fcc26fd6b4b5257` |
| `开智小曲-发布文案.txt`（标题 / 标签 / 精简介绍 / 整段粘贴版 / 长版资料，UTF-8） | 3,067 | `c2ef92fa761a8722c4b5ab08d6d93f1c01c08102943489dacacd2a4b19532734` |
| `封面审图.md`（我的审图结论） | 2,031 | `f92278a0ded327f7f50ab158d376e9811018ffd65465aa800a54700f9fce33fe` |
| `封面可编辑源.tar`（Canvas 源码、实测低音数据、字体子集、渲染工具、README） | 92,160 | `f93eb9d99804966c63f8e209e2820e3473d687633309cac4e4ff3621ef85ba07` |
| `review-music-cover.tar`（审图过程图与草稿，只归档、不放桌面） | 18,145,280 | `79f86d56b484c2e3e3ac714761cc8615e17aa15dfab7f73c1636de8d67cd0f11` |

同目录 `SHA256SUMS` 列出以上五项。

## 1. 服务器端核对（取回前）
```
cd /dev/shm/pdx/deliver-music-publish && sha256sum -c SHA256SUMS
```
预期：五行都是 `OK`。

## 2. 取回到 M4
把 `deliver-music-publish/` 里的全部文件（上表五项 + `SHA256SUMS` + 本文件）原样取回到 M4 上新建的空目录：
`/Users/guchuan/Desktop/how-to-make-ai-video/output/music-three-films-20261021/publish-r2/`
（目录已存在：停下回报。）

## 3. M4 端核对
```
cd "/Users/guchuan/Desktop/how-to-make-ai-video/output/music-three-films-20261021/publish-r2"
shasum -a 256 -c SHA256SUMS
sips -g pixelWidth -g pixelHeight "开智小曲-封面-1080x1920.png"
iconv -f UTF-8 -t UTF-8 "开智小曲-发布文案.txt" > /dev/null && echo "utf8_ok"
shasum -a 256 "/Users/guchuan/Desktop/how-to-make-ai-video/output/music-three-films-20261021/out/C-秘密在低音里-加长版-r2.mp4"
```
预期：五行 `OK`；`pixelWidth: 1080`、`pixelHeight: 1920`；`utf8_ok`；最终视频 sha256 = `8f8e9c97caef4ff6b5f26837938a7580e9716f9ce0f6cd2d1b4985748aaadfe3`（不是这个值就停下）。

## 4. 放到桌面（新建文件夹，不覆盖任何已有文件）
```
cd "/Users/guchuan/Desktop/how-to-make-ai-video/output/music-three-films-20261021/publish-r2"
F="/Users/guchuan/Desktop/开智小曲-发布素材"
[ -e "$F" ] && F="/Users/guchuan/Desktop/开智小曲-发布素材（2）"
[ -e "$F" ] && { echo "STOP: both folder names exist"; exit 1; }
mkdir "$F"
cp -n "开智小曲-封面-1080x1920.png" "开智小曲-发布文案.txt" "封面审图.md" "$F/"
tar -xf "封面可编辑源.tar" -C "$F"
cp -n "/Users/guchuan/Desktop/how-to-make-ai-video/output/music-three-films-20261021/out/C-秘密在低音里-加长版-r2.mp4" "$F/开智小曲-最终版视频.mp4"
shasum -a 256 "$F/开智小曲-封面-1080x1920.png" "$F/开智小曲-发布文案.txt" "$F/封面审图.md" "$F/开智小曲-最终版视频.mp4"
ls -la "$F" "$F/封面可编辑源"
```
预期：封面、文案、审图的 sha256 与第 0 步表格相同；`开智小曲-最终版视频.mp4` 的 sha256 = `8f8e9c97caef4ff6b5f26837938a7580e9716f9ce0f6cd2d1b4985748aaadfe3`（与原片逐字节相同，不重编码）；`封面可编辑源/` 里有 `README.md`、`cover-src/`、`tools/`。`review-music-cover.tar` 只留在 `publish-r2/`，不放桌面。不要动桌面上任何已有文件和原片。

## 5. 回报（原样贴输出）
第 1–4 步每条命令的输出；桌面文件夹的实际名字；以及当前会话里可点的链接（若用了备用名，把路径里的文件夹名换成 `开智小曲-发布素材（2）` 并相应编码）：
- 最终视频：`file:///Users/guchuan/Desktop/%E5%BC%80%E6%99%BA%E5%B0%8F%E6%9B%B2-%E5%8F%91%E5%B8%83%E7%B4%A0%E6%9D%90/%E5%BC%80%E6%99%BA%E5%B0%8F%E6%9B%B2-%E6%9C%80%E7%BB%88%E7%89%88%E8%A7%86%E9%A2%91.mp4`
- 封面：`file:///Users/guchuan/Desktop/%E5%BC%80%E6%99%BA%E5%B0%8F%E6%9B%B2-%E5%8F%91%E5%B8%83%E7%B4%A0%E6%9D%90/%E5%BC%80%E6%99%BA%E5%B0%8F%E6%9B%B2-%E5%B0%81%E9%9D%A2-1080x1920.png`
- 文案：`file:///Users/guchuan/Desktop/%E5%BC%80%E6%99%BA%E5%B0%8F%E6%9B%B2-%E5%8F%91%E5%B8%83%E7%B4%A0%E6%9D%90/%E5%BC%80%E6%99%BA%E5%B0%8F%E6%9B%B2-%E5%8F%91%E5%B8%83%E6%96%87%E6%A1%88.txt`

取回后可以只读查看 PNG、核对文本/尺寸/完整性；不要改动任何画面或文案。然后停止，等用户反馈。
