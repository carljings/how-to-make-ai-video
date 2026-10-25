# Roadster science and vehicle-structure audit

Checked2026-10-18. Scope: verify the physics, distinguish manufacturer statements from as-built structure, and correct the film. V6 is a superseded draft. V7 is being revised; this report is not an engineering certification.

## Evidence and corrections

### A01 Official architecture

Tesla describes fan+ground-sealing and cold-gas systems; Rocket has perimeter thrusters. Manufacturer claim, not independent test certification.

Film action: Keep with attribution; do not transplant Thrust/performance model layout to Rocket.

Source/evidence: https://www.tesla.com/en_GB/roadster

### A02 Fan positions/count

V6 two central floor rotors are inferred schematic, not verified Roadster hardware. Patent claim1 describes an underbody inlet, pathway and rear outlet with one or more ducted fans. A patent does not prove the demonstrated implementation.

Film action: Remove specific twin-floor-rotor cutaway. Show separate generic functional airflow diagram, not an alleged actual internal layout.

Source/evidence: https://patentsgazette.uspto.gov/week39/OG/html/1550-5/US12746987-20260929.html

### A03 Seal and flow

Fan downforce needs the low-pressure region to be maintained, with sealing/leakage management and continuous powered airflow.

Film action: Explicitly include sealing, not fan-only magic.

Source/evidence: https://www.tesla.com/en_GB/roadster

### A04 Suction versus pressure

Suction/adhesion is the pressure-difference mechanism. Saying it is NOT suction but pressure is a false dichotomy.

Film action: Replace misconception card with a question about how suction works; call it pressure-difference adhesion.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure

### A05 Pressure force

Approximate resultant Fp=(p_out-p_gap)Aeff only for a simplified approximately uniform useful patch; exact resultant requires pressure integration.

Film action: Use symbolic qualitative force, not measured CFD or calibrated magnitudes.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure

### A06 Static ceiling

With n toward a flat ceiling and no other vertical loads, N=Fp-mg. Need Fp>mg for positive tyre load, not merely Fp=mg.

Film action: Force arrows remain qualitative; no assertion of measured margin.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/6-1-solving-problems-with-newtons-laws

### A07 Vertical grip

On a vertical wall in a simple model N≈Fp; steady climbing requires tyre traction to support gravity, with |Ft|≤mu*N as a simplified friction bound. The illustrated normal adhesion force is not tangential tyre drive; the full fan/exhaust system can have other aerodynamic components, not quantified here.

Film action: Fans add normal load; tyre drive supplies tangential propulsion.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/6-2-friction

### A08 Curvature

Moving on a curved track requires acceleration v²/R; static adhesion alone does not validate every moving pose.

Film action: Preserve source-fitted poses as CG reconstruction, not physics-solved motion or measured performance.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force

### A09 Gravity

Gravity stays world-down; pressure-load direction follows the nearby surface.

Film action: Keep consistent vectors on wall/ceiling/airborne.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/6-1-solving-problems-with-newtons-laws

### A10 Seal loss

An opening increases leakage and reduces effective pressure support depending on fan flow and geometry. It is not a universal instantaneous zero at the first small opening.

Film action: Replace pressure-difference instantly disappears with seal lost/adhesion weakens. After fully clearing the surface the old adhesion cannot provide the same support.

Source/evidence: https://www.tesla.com/en_GB/roadster

### A11 Cold gas meaning

Cold-gas thrust does not require combustion; it does not mean an air-conditioning system or a specified cryogenic temperature.

Film action: Use high-pressure gas/cold-gas propulsion; no flames, no invented gas species or temperature.

Source/evidence: https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/

### A12 Reservoir layout

Exact tank count, capacities, pressure, liner, wall thickness and placement were not verified from accessible primary sources.

Film action: Remove two claimed internal capsules; use a separate reservoir→control→nozzle functional schematic, explicitly not the car layout.

Source/evidence: https://ntrs.nasa.gov/citations/20110008406

### A13 COPV attribution

General COPV engineering describes composite overwrap and a fluid-retention barrier; that does not establish this Tesla vessel architecture/material/dimensions. The Tesla X COPV post was blocked in this audit.

Film action: Discuss general concept only if labelled; do not infer Tesla BOM from NASA examples or inaccessible reposts.

Source/evidence: https://ntrs.nasa.gov/citations/20110008406

### A14 Jet reaction

Force on the vehicle is opposite exhaust momentum; a simplified thrust expression includes mass flow, exhaust velocity and exit-pressure term.

Film action: Do not imply jets need to hit the floor or create downward suction.

Source/evidence: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/

### A15 Upward force versus rise

Upward thrust does not guarantee upward velocity/acceleration. Net force and current velocity matter.

Film action: Text: exhaust downward / reaction thrust upward, not inevitably car rises.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/6-1-solving-problems-with-newtons-laws

### A16 Torque line of action

A nozzle being away from COM is insufficient if the thrust line passes through COM. tau=r×F; nonzero lever arm matters.

Film action: Text: thrust line misses COM / produces torque. Net torque, not a single assumed nozzle, controls the full manoeuvre.

Source/evidence: https://openstax.org/books/university-physics-volume-1/pages/10-6-torque

### A17 Attitude control

Tesla describes perimeter thrusters and fast electric actuators for Rocket attitude support. Actual valve/control laws and measured forces are not established here.

Film action: Show a general torque mechanism; do not claim to reverse-engineer the complete controller.

Source/evidence: https://www.tesla.com/en_GB/roadster

### A18 Visible lines

Source-visible cables/lines exist; their support/control role is not established by our footage analysis.

Film action: Retain the separate-demonstration card and visible-lines/unknown-role note; do not claim untethered proof.

Source/evidence: https://x.com/elonmusk/status/2110913107094606330

### A19 Finite reserve

Stored gas provides finite total impulse; it may need replenishment. Exact endurance and replenishment mechanism/time not confirmed.

Film action: Use reserve finite/needs replenishing, not irreversible fuel disappearance or invented flight seconds.

Source/evidence: https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/

### A20 Fan power

Under a low-pressure-rise, approximately incompressible steady-flow approximation, fluid power is DeltaP*Q; shaft/electric power is greater after efficiency losses. This is an independent work/energy derivation, not Tesla power data.

Film action: Avoid implying passive/perpetual ceiling adhesion. No unsupported fan power figures.

Source/evidence: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/air-pressure/

### A21 Model geometry

Car/ramp dimensions, nozzles and internal shapes are visually fitted/illustrative, not factoryCAD or validated structural analysis.

Film action: Retain external source fit; remove unsupported hardware placement and claim only CG reconstruction.

Source/evidence: output/roadster-flight-explainer-v6/geometry/roadster.py; geometry/export_v5.py; web/engine/timeline.js

### A22 Configuration mismatch

The official product page distinguishes Performance, Thrust and Rocket; they do not all have the same seating or thruster package.

Film action: Do not call the flying demo a universal stock Roadster feature.

Source/evidence: https://www.tesla.com/en_GB/roadster

## Independent mechanics derivation

Take n toward the track. With contact force -N*n, Newton projection gives N=Fp+m*g·n+T_n+other_n-m*a_n. Static flat ceiling (other loads neglected):N=Fp-mg; static ground:N=Fp+mg. Positive tyre contact load requires a margin. A simplified friction bound and curvature acceleration must also be considered; neither real tyres nor fitted trajectories are validated here.

Upward thrust is not upward motion. Translational net force and initial velocity both matter. Individual torque is r×F; an off-centre mounting point is insufficient if its force line crosses COM. Actual attitude depends on summed torques, inertia, angular momentum and controls. The normalized counterexamples in .omx/artifacts/roadster-v7-20261018/mechanics-sanity.json are logical checks, not Tesla performance tests.

## Access and applicability limits

Tesla product wording was obtained from primary-page indexed text returned by the web tool; direct body extraction was minimal. Direct X access returned403. USPTO Gazette claim1 was read directly; the GooglePatents full-text endpoint was unavailable. Separate raw HTML/GIF archival failed SSL and is not claimed as successful. No factoryCAD/BOM, calibrated actual pressures/thrust/mass/inertia or independent structural tests were obtained.

Do not transfer a patent embodiment, another manufacturer’s dual-fan car, an older Roadster manual or past prototype plans to this as-built demonstration. NASA COPV and small-spacecraft propulsion references explain general technologies, not Tesla-specific vessel design or thrust performance. The local geometry and kinematics are inferred/schematic.

## Film and sound status

The new film must remove false suction-vs-pressure wording, invented twin-floor-fan/two-tank placements, instantaneous seal-loss claims, upward-force-as-upward-motion wording and single-jet flip certainty. It keeps the separate demo and visible-lines uncertainty. A visibly separate functional system schematic can explain principles without claiming the car layout. Music is also being rebuilt as sparse gentle ambient sound, without speech. Technical completion and human aesthetic/listening acceptance remain separate.


## Original publisher records

Existing local metadata for The Ramp and Roadster Event was rechecked: videoIDs,Tesla/@tesla,verifiedchannel record and20261016upload date agree. This is a retained-record check,not a fresh successful download. Slow motion,freezes andeditedcameraangles cannot be added as continuous flight time. Equal-looking wheel arrows do not establish equal realwheel loads withoutCOM,pressure-centre andstructural data.


## Vacuum terminology

Engineering vacuum is not necessarily a perfectly empty volume. Do not contrast low pressure with vacuum as mutually exclusive categories. The film labels the schematic low-pressure zone as containing air; no actual cavity pressure or vacuum grade is asserted. [CERN vacuum fundamentals](https://repository.cern/records/kvaca-9yd73/files/CERN-THESIS-2022-154.pdf?download=1).
