# Opus code-video production: direction, motion and a faithful rendering chain

[简体中文](zh-CN/opus-video-production-method.md) · Reviewed 24 October 2026

This note records what we verified in a Claude Code / Opus Rubik’s-cube film: its brief, storyboard, scene code,
production records and encoded frames. The user chose that original as the aesthetic reference. It is one
observed workflow, not a claim that every Opus film uses this stack or that a model name guarantees quality.

The reusable method is to design a visible action for each idea, coordinate picture and sound on one timeline,
and preserve the chosen visual language when making corrections.

## 1. Direct the explanation before implementing it

Start with a concrete viewer question and the answer the ending must deliver. Reduce the middle to a few
connected ideas. The cube film carries three numbers through its explanation, then returns to the opening
competition puzzle with real scoring cards. Its final timer reset gives the closing question a visible action.

Before scene code, establish the brief, facts, storyboard and a look test. For each shot, specify:

- what the viewer should understand;
- the one main action that makes it visible;
- framing, movement, emphasis and the short text that belongs beside the action;
- the musical cue or sound effect, and what state the shot leaves behind.

Follow the storyboard already confirmed by the user. Explicit existing approval does not need to be requested
again at every routine step. Facts, units and round/scoring context constrain the wording, even when a more
dramatic sentence would sound attractive.

## 2. Make motion do explanatory work

| Idea | Action used in the case | What must remain clear |
|---|---|---|
| Internal structure | Wireframe, core and axles, then an exploded view | The same object survives assembly and separation |
| Permutations | Corners and edges change places | Identity is tracked separately from screen position |
| Orientation constraints | Pieces twist or flip; the last one is marked as constrained | Markers follow the current pose of the correct piece |
| A tight mathematical bound | Upper and lower bounds close together at 20 | The visual is an explanation of the proof, not the proof itself |
| Human solving methods | Real layer turns reach distinct intermediate goals | Highlights, labels and actual states agree |
| Average-of-five scoring | Five cards arrive, two leave, three combine | The data and the competition round are explicit |
| An ending | Return to the original cube, reset the timer, let the sound decay | The opening question receives its payoff before the file ends |

Use macro views, orbits, pull-backs, exploded parts, diagrams and cards when they help the explanation. Keep
object identity, color meaning and causal continuity across them. Avoid repeating the same title/cube/caption
layout for every idea, and avoid unrelated movement competing with reading.

Pacing has to fit the film’s purpose. A short overview does not need to teach every algorithm move. Adding a
pause after every stage or freezing the camera can make an explanation easier to inspect while weakening the
continuous movement the user liked. Judge the sequence, not just isolated stills or a move-per-second count.

## 3. The actual rendering chain

The original uses Canvas 2D with a custom cube model and perspective drawing. Node orchestrates headless
Chrome; the browser does the drawing. It is not a native Node Canvas export.

1. Precompute seeded visual data and real move-state snapshots.
2. Obtain each frame from its film time, such as frame number divided by frame rate. Do not depend on wall-clock
   time, unseeded randomness or the order in which earlier frames happened to render.
3. Load the local fonts and wait for the film to be ready.
4. Render the requested time in Chrome, wait for composition, capture the frame and pipe it to FFmpeg.
5. Encode and join completed chunks; verify their source/timing assumptions before reusing them.

The cube’s appearance combines perspective, correct face/layer ordering, rounded faces, directional shading,
specular highlights, rim light, contact shadow and motion blur sampled at several nearby film times. These
serve the camera and the explanation. Naming an effect or asking for a “cinematic” look is not enough.

The local case used these module boundaries. They are reference names from the sample project, not links to
files published with this note:

| Module | Responsibility |
|---|---|
| `timeline.js` | Named events and the common film clock |
| `cube.js` | Piece identity, position, orientation and legal moves |
| `seqs.js` | Timed real moves, intermediate snapshots and turn-sound events |
| `draw3d.js` | Camera, projection, visibility, surfaces and temporal sampling |
| `scenes/` | Each idea’s framing, action, text and transitions |
| `score.js` | Music and effects scheduled from the same events |
| `render.mjs` | Chrome frame capture and FFmpeg export |

The example ran on an M4 with Chrome’s Metal backend. That is a recorded environment, not a universal GPU
requirement. For a faithful revision, preserve the renderer, backend/configuration, fonts, color handling and
encoding assumptions unless changing them is an explicit separate experiment.

## 4. Compose sound with the picture

The original synthesizes its score offline with Web Audio in Chrome, exports WAV, then uses FFmpeg for
mastering and AAC/MP4 output. Music contains a whole-film arc: anticipation, build, a major reveal, a lighter
section, renewed drive and resolution. Effects belong to physical events, not arbitrary extra decoration.

In this case the clock is 120 BPM: a beat is 0.5 seconds and a bar is 2 seconds. Named cues synchronize the
2.5-second timer stop, the 26-second explosion, the 44-second count reveal, the 80-second “20” reveal and the
closing chord at 152 seconds. The same move list drives real layer turns and their clicks. Every turn need
not land on a musical beat; the important reveals have deliberate accents.

Keep gain envelopes well-defined and avoid unintended clicks or automatic make-up gain. Check the encoded
audio after mastering; this project targets about −14 LUFS and true peak at or below −1.5 dBTP. Loudness,
waveforms and offset measurements establish technical properties. They do not establish musical taste.
If the available reviewer cannot listen, state that limit and leave subjective listening to a capable reviewer.

This film’s caption-only presentation, 120 BPM and nine-second closing act were specific choices. They are
not mandatory settings for future narrated or differently paced films.

## 5. Review the artifact that will be delivered

Review per act, inspect key actions with consecutive frames, correct what the pictures actually show, then
check the encoded MP4 again. Keep separate records for:

| Check | Evidence | What it cannot establish alone |
|---|---|---|
| Facts and mechanics | Sources, units, real state/goal checks | Viewer understanding or visual quality |
| Layout and motion | Keyframes and selected consecutive-frame strips | Whole-film flow or watch-through rate |
| Media integrity | Frame count, duration, full decode, codec and audio measurements | Attractive editing or pleasant music |
| Experience | Continuous viewing, actual listening and the intended viewing size/device | Audience response without audience data |
| Delivery | The correct final file, preserved originals and matching checksums | That a cloud copy has finished uploading |

Keep important text clear of the subject and platform overlays. Check incomplete, active and completed
labels; adding a check mark changes the width. Attach callouts to the same animated identity/transform as the
object, not to a remembered initial coordinate. Compare a claimed self-review with the images and fixes that
actually exist.

Deliver the final playable file to the user’s agreed location, preserve the project and originals, and verify
the delivered copy. For this user the agreed destination is the Downloads folder in iCloud Drive; resolve the
actual local folder rather than assuming the ordinary system Downloads folder. Do not publish personal paths
or claim server/device synchronization merely because the local copy exists.

## 6. What the revision comparison taught

A Codex revision changed the visual export to native Canvas, changed the Web Audio implementation, added
dark timer backing and red callout graphics, narrowed a camera move and increased pauses. It fixed real
annotation problems, but the user preferred the original’s overall presentation. Technical correctness did not
justify calling the full set of aesthetic changes an improvement. The engine change also introduced another
variable; it was not proven to explain every perceived difference.

The following faithful revision returned to the original code and production chain. It changed only two
scene files for lock anchors, F2L numbering and stage-label spacing. It kept the original time, cameras, fonts,
visual core, score and Chrome exporter. Verification established:

- 158 seconds, 1080×1920, 30 fps, 4,740 frames;
- 43 original chunks / 3,840 picture frames retained with identical encoded payloads and timestamps;
- ten affected chunks / 900 frames rendered with the original Chrome exporter;
- all 7,408 original AAC packets and their timestamps retained without audio re-encoding;
- full decode passed; final audio measured −14.3 LUFS and −1.98 dBTP.

Those results prove the stated preservation and technical properties. They do not stand in for continuous
viewing, subjective listening or a physical-phone test, none of which this audit claimed to complete.

For future revisions, start with the selected film. Fix confirmed errors with the smallest change, compare a
short affected sequence, and keep aesthetic redesign or a new rendering engine as separately evaluated work.

## 7. A brief an assistant can act on

> Use the approved sample as the aesthetic and production reference. Start with facts, a storyboard and a look
> test. Give each shot one main explanatory action; coordinate picture, text, music and effects through named
> timeline cues. Keep the selected renderer, fonts, camera language and sound method. Review per act and from
> the final encoding. On an existing film, fix confirmed problems without adding unrelated UI, stopping motion
> throughout or silently replacing the render/audio engines. Plan the closing payoff and sound tail. Preserve
> originals, record what was actually checked and deliver to the agreed folder. Apply approvals already given;
> do not repeatedly stop for the same decision.

For a runnable repository example, use the [code path](03-path-b-code.md) and [starter](../starter/README.md).
See also [sound](04-sound.md) and [edit/export checks](05-edit-and-export.md). This documentation submission
does not publish the local cube movie, source archive or private session records.
