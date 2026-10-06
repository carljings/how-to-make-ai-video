# 2 · Path A: generate the shots with a video model

You describe a shot, and a video model paints it. Use this path for anything with **people, places, weather, animals, live-action or anime looks**: short dramas, ads, music videos, B-roll.

## What the models can take as input

| Mode | You give | Good for |
|---|---|---|
| Text → video | A prompt | Establishing shots, B-roll, anything without a recurring character |
| Image → video | A first frame (and a prompt) | Exact composition; continuing from the previous clip's last frame |
| First + last frame | Two images | A controlled move or transformation between two states |
| Reference → video | Images of characters / places, referred to in the prompt | **Recurring characters**: the backbone of any story |
| With native audio | Same as above, with audio switched on | Dialogue, ambience and effects generated with the picture |

One generation is usually **5–15 seconds**. A longer film is many clips joined in the edit, which is why the storyboard matters so much.

## Choosing a model

Commonly used families include Seedance (ByteDance), Kling (Kuaishou), Hailuo (MiniMax), Vidu (Shengshu), Veo (Google), Runway and Luma, plus open-weight models such as Wan and HunyuanVideo that you can run yourself on a GPU. (OpenAI's Sora was discontinued in 2026: the app on 26 April, the API on 24 September.) Versions change every few months, so compare on what you need rather than on a ranking. For the Chinese platforms where you use these models (即梦, 小云雀, LibTV, LiblibAI, TapNow, Flova), see [Chapter 6](06-platforms-compared.md).

| Check | Why it matters |
|---|---|
| Max clip length, resolution, aspect ratios | 9:16 for Douyin/TikTok/Shorts, 16:9 for YouTube/Bilibili |
| Reference images: how many, and how they're addressed in the prompt | Character consistency across a story |
| Native audio and lip-sync | Saves a separate voice + sync pass, if the language you need is supported |
| Price per second / per generation | A 3-minute episode is 15–20 clips *before* re-dos |
| Commercial-use terms | Some plans don't allow it |
| Open weights | Run locally, no per-clip cost, but needs a strong GPU |

## The workflow that worked

This is how the 16-clip, 3:16 vertical episode in [`examples/`](../examples/README.md) was made (in a Toonflow canvas with a MiniMax model, 9:16, 768p, native audio).

1. **Script → segments.** Split the script into segments no longer than the model's maximum (10–15 s each). Each segment is one continuous moment: one place, one action, one or two lines of dialogue.
2. **Reference sheets first.** Generate one image per main character (front and side, full body, the outfit they wear in this episode) and one per location. Pick the best and **lock** them; never regenerate a reference mid-episode.
3. **One prompt per segment**, using the [shot-prompt template](../templates/shot-prompt.md). Attach references in a fixed order, and refer to them by number in the prompt (for example `{{ref 1}}` = the heroine, `{{ref 2}}` = the street).
4. **One take each, then review.** Generate every segment once, make a contact sheet per clip with [`tools/review.sh`](../tools/review.sh), and regenerate only the failures.
5. **Log everything** in a [production log](../templates/production-log.md): segment, prompt, references and their order, output file, status. Generation can time out and still succeed; check the log and the output folder before re-running, so you don't pay twice.
6. **Assemble** with [`tools/stitch.sh`](../tools/stitch.sh): hard cuts in storyboard order, then titles, subtitles and an optional music bed. See [Chapter 5](05-edit-and-export.md).

## Prompt anatomy

```
[Shot]      Medium close-up, eye level, 35 mm, shallow depth of field.
[Subject]   {{ref 1}} — young woman in a faded grey Taoist robe, hair in a wooden pin, cloth bag on her shoulder.
[Action]    She stops at the kerb, looks up at the traffic light, then takes one hesitant step back.
[Camera]    Slow push-in.
[Place]     {{ref 2}} — a busy city crossroads at night, wet asphalt, neon reflections.
[Light]     Cool street light from the left, warm shop glow behind her.
[Mood]      Out of place, curious, a little afraid.
[Sound]     City traffic, a distant horn. She whispers: "So many people…"
[Avoid]     On-screen text, extra people in the foreground, changing her outfit.
```

Write the *same* description of each character's look in every prompt, word for word. Keep **one action per clip**; two actions ("she turns and runs to the car and opens the door") is where models drift.

## Keeping continuity between clips

- **Last frame → first frame.** For continuous action, start clip N+1 from the last frame of clip N:
  `ffmpeg -sseof -0.1 -i clip07.mp4 -frames:v 1 -update 1 clip07_last.png`
- **Cut on action or on a look.** Hard cuts hide small differences far better than slow dissolves.
- **Close-ups for emotion, wide shots for place.** Wide shots with several people are where faces drift most.
- **One costume per episode.** Outfit changes are the fastest way to lose a character.

## Common failures and fixes

| Failure | Fix |
|---|---|
| Garbled on-screen text (signs, titles) | Ask for no text; add it in the edit |
| Face or outfit drifts | Stronger reference, closer framing, fewer people in shot, shorter action |
| Hands, objects merging | Hide hands, simplify props, cut away sooner |
| Floaty physics, slow motion | Ask for "real-time speed"; trim the clip; cut on the action |
| Lip-sync off | Shorter lines; or generate without dialogue and add voice later (Chapter 4) |
| Clip ends on a messy frame | Trim the tail in `shots.txt` (`clip.mp4 0 9.2`) |

## Rights and labels

- Check the model's **commercial-use terms** for your plan before publishing for money.
- Don't generate **real people** (or their voices) without their consent.
- Many platforms ask you to **label AI-generated content**, and China has required labels on AI-generated content since September 2025. Switch the platform's AI label on when you upload.
