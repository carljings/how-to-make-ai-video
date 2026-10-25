# 本片字体支持

可随工程携带的 Noto Sans SC 开源字体子集，衍生字体名称为 **Roadster Film Sans**。提供真实的 500、700、900 字重，分别保存 WOFF2（浏览器/Remotion）和 TTF（Blender/FreeType）。没有分发 macOS 专有系统字体。

`subset-characters.txt` 是完整的 329 个码位清单，其中有 199 个汉字，以及可打印 ASCII、标点、指定数学符号和箭头。它覆盖 `blender/data/film_cues.json` 的已确认旁白、`film.py` / `diagram.py` 的中文显示文字，以及协调者指定的来源/原理/封面候选文字。候选文字只用于扩大字形覆盖，不代表新增已批准的画面内容。文字变化后应重新检查。

旧原型的 `NotoSansSC-500.woff2` 在最终清单中缺少 **58** 个码位。新的六个字体文件完整覆盖清单。使用 Pillow/FreeType 将三种字重的全部非空格字符实际栅格化，未发现空字形或与缺字方框相同的字形，并已查看 `font-raster-proof.png`。这仅验证字体资源，成片仍需检查字体加载、排版、字幕安全区和手机效果。

浏览器可加载 `fonts.css`，使用 `font-family: 'Roadster Film Sans'; font-weight: 500`（也可用 700/900）。CSS 假设字体在同一目录。Remotion 可将本目录复制到 `public/fonts`，按现有工程的 `staticFile` 方式引用，并在截帧前等待 `document.fonts.load('700 48px "Roadster Film Sans"')`。Blender 文字对象可使用 `bpy.data.fonts.load` 加载对应 TTF。

官方完整源字体为 17,772,300 字节，仅保留在内部工作文件中。`provenance.json` 保存下载地址、SHA-256、Git blob SHA、许可和审核时的输入源文件哈希。已附 SIL Open Font License。子集使用新的字体名称，并保留原版权与许可记录。

下面的命令已在仓库根目录使用现有 Python/fontTools 执行：

```sh
python3 output/roadster-flight-explainer/support/fonts/build-subset.py .omx/artifacts/roadster-production-20261016/font-support/NotoSansSC-full-variable.ttf
```

脚本先检查完整源字体，再生成子集、实例化实际字重，最后检查保存结果。连续两次生成的 SHA-256 完全一致。`coverage.json` 包含输出文件哈希和缺字检查；`coverage-candidates.json` 保存生成清单的原始文字。
