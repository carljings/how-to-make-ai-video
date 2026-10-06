# Shot prompt template (Path A)

Copy one block per storyboard row. Attach references in the order listed, and keep that order identical everywhere the same references appear.

```
Shot <#> · <duration> s · <aspect>
References: {{ref 1}} = <character>, {{ref 2}} = <place>

[Shot]    <framing>, <angle>, <lens>, <depth of field>
[Subject] {{ref 1}}: <the SAME look description every time: age, hair, outfit, props>
[Action]  <ONE action, in present tense, with a clear end state>
[Camera]  <static | slow push-in | pan left | handheld follow | …>
[Place]   {{ref 2}}: <time of day, weather, key details>
[Light]   <direction, colour, mood of the light>
[Mood]    <two or three words>
[Sound]   <ambience, effects>. <Name> says: "<one short line>"
[Avoid]   on-screen text, extra people in foreground, outfit changes, slow motion
```

## Worked example

```
Shot 4 · 12 s · 9:16
References: {{ref 1}} = Chen Xiaoman, {{ref 2}} = city crossroads at night

[Shot]    Medium close-up, eye level, 35 mm, shallow depth of field
[Subject] {{ref 1}}: 19-year-old woman, black hair in a wooden pin, faded grey Taoist robe, cloth bag on her left shoulder
[Action]  She stops at the kerb, looks up at the changing traffic light, and takes one hesitant step back
[Camera]  Slow push-in
[Place]   {{ref 2}}: busy crossroads at night, wet asphalt, neon reflections, cars passing behind her
[Light]   Cool street light from the left, warm shop glow behind
[Mood]    Out of place, curious, a little afraid
[Sound]   Traffic, a distant horn. Xiaoman whispers: "So many people…"
[Avoid]   On-screen text, extra people in foreground, outfit changes, slow motion
```

## Reference sheet prompts (generate these first, then lock them)

```
Character sheet of {{name}}: <age>, <build>, <face details>, <hair>, <outfit>, <props>.
Front view and side view, full body, standing, neutral expression, plain light-grey background,
even studio lighting, <style: photoreal | anime | 3D>, no text.
```

```
Location plate: <place>, <time of day>, <weather>, <key landmarks>, no people,
<style>, wide establishing view, no text.
```
