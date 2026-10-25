# Independent final-film and late-act review

**PASS for final-file technical checks and sampled late-act/cover review. No new blocking finding.** Production source and audio were not edited; no additional finalizer or Blender process was launched.

The actual final MP4 is **1080×1920, 30 fps, exactly 2250 frames / 75.000 seconds**, H.264/yuv420p, stereo 48 kHz AAC. Independent full FFmpeg decode passed; the near-black scan found no image outage. Encoded audio measures **−14.1 LUFS / −2.1 dBTP**. This is a technical measurement, not a subjective listening assessment.

Final file: 41,676,902 bytes. SHA-256: `d355b08e4377b3bb5cbcb6b0de3ce1ef19764a456f36b94aad7764dbe018a342`, matching finalizer metadata. The master remains `a5cf9a2b5b00482fc37b530e64f350c38afedee865a45d38e3c68607d0ec9b51`, so the existing checked/cached ASR master is unchanged. The canonical finalizer's `verification.json` also reports `technical_pass: true`; its caption DOM audit was not redundantly rerun by this review.

## Actual encoded visual samples

- **40–51 s — torque:** [chronology sheet](torque-contact.jpg). At [43 s](native/f01290.png), the rear thrust, offset line and moment are distinct and readable. At [46 s](native/f01380.png), the opposite end's thrust reverses the illustrated moment. At [48 s](native/f01440.png), the rotated attitude and jets remain legible, with the explicit rotation-only qualification. At 50–51 s, gravity and “翻转 ≠ 悬停” distinguish the subsequent fall from hovering.
- **52.1–64 s — finite reserve:** [chronology sheet](reserve-contact.jpg). The [56 s native frame](native/f01680.png) clearly separates the ghost shell and whole pressure vessels, with “特斯拉称 · 位置示意”. At [61 s](native/f01830.png), the reserve indicator loses lit dots and the pulse annotation remains readable; there is no liquid-style draining level.
- **65–70 s — hypothetical hover/control:** [chronology sheet](limits-contact.jpg). The [68 s native frame](native/f02040.png) explicitly labels “假设：持续推力悬停”, shows thrust opposite gravity, distinguishes “推力 = 重力” from “姿态控制”, and states “还得控制运动”. “演示 ≠ 通勤” follows at 70 s.
- **72–74.967 s — ending:** the final [encoded frame2249](native/f02249.png) retains the complete “气量 · 能量 · 安全” takeaway and closing scene. No missing closing image or truncated headline was seen.
- [39.967/40 s cut pair](cut-reaction-torque.jpg) and [52.067/52.1 s cut pair](cut-torque-reserve.jpg): deliberate short dips bridge the camera/centre-of-mass changes. They are not missing plates or unexpected blackouts.

No missing-glyph boxes, clipped caption text, label/caption collisions or unexpected frozen plateau were seen in this sampled chronology. Existing explanatory holds remain consistent with their spoken topics.

## Generated covers at phone-thumbnail size

[Actual cover phone grid](covers-phone-grid.jpg): the generated 9:16 cover is shown at **243 px wide**, the 3:4 cover at **324 px wide**. Both keep the complete main question and entire car visible; the subject and headline are clear. Their actual file sizes are 1080×1920 and 1080×1440. The boundary tag is present in both formats. This is a thumbnail check, not a physical-phone acceptance claim.

## Scope limits

This review inspected 34 unique encoded frame samples, including native details and phase-cut boundaries, alongside complete decoding. It does not claim every one of 2250 frames was visually inspected at native resolution, subjective audio listening, physical-phone viewing, exact photogrammetric reconstruction or certified vehicle capability. The first40-second encoded prefix review is separate evidence; final source plates and the master remain unchanged.

Machine evidence: [verification-independent.json](verification-independent.json), [ffprobe.json](ffprobe.json), full decode / near-black / loudness log (local verification artifact, not distributed).
