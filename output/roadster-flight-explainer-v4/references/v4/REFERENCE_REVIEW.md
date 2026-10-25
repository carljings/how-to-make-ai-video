# Ramp reference review / 坡顶核对

Primary source: Tesla, The Ramp | Roadster, https://www.youtube.com/watch?v=7p5LxFdc-Qg,2026-10-16. Existing native1920×1080 analysis copy,45.628917s,24000/1001fps. No download was needed for this revision.

## Confirmed observations / 已观察

- 4s: main wide view shows tall curved ramp, red edges, center line and rear steel lattice. Upper road panel is oblique in this perspective.
- 18s: close replay shows the car near the upper road edge, with strong foreshortening.
- 32/34/38s: elevated view reveals a long straight upper extension and cantilevered structural members; the entire top silhouette differs from the v3 rounded145deg termination.
- Existing v3 source `blender/v3_ramp.py` has only three circular arcs, no finite straight upper section. Its `s>S_LIP` straight continuation is virtual for wheel departure, not an actual rendered deck.

## Inference and constraints / 推测与边界

Exact profile angles, deck length, height and width require a visual multi-view fit. These are reconstruction parameters, not official dimensions. A straight image edge alone is insufficient to determine a world-horizontal plane. Upper support members must not be mistaken for road surface; check the white surface, red edge lines and connections from multiple views.

Any profile change must update visible mesh, rigid contact poses, lip event/airborne continuation, support geometry, force-overlay projection and camera bounds together. The previous source-fit flight cannot simply remain at an old145deg lip.

## Revision evidence / 修订参考

`source-04s.jpg`, `source-18s.jpg`, `source-34s.jpg` are native extracted frames. `rejected-v3-opening.jpg` and `rejected-v3-contact.jpg` are extracted from the actual encoded v3, not design mockups.

## Pending acceptance / 待验收

Opus director plan and code; actual native1080 side/elevated proof; short composed dynamic opening; whole film and audio QA after proof review. Technical pass must not be called human aesthetic approval.
