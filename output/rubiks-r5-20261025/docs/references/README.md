# Polylog visual reference

User-confirmed reference: The trick that solves Rubik’s Cubes and breaks ciphers, https://www.youtube.com/watch?v=wL3uWO-KLUE&t=471s (7:51–8:15).

Original animation source: https://github.com/polylog-cs/rubiks-cube-video/blob/main/cube_solution.py . MIT license is retained alongside this read-only source reference. No original video or audio is reused.

Relevant classes: BFSCircleAnimations, generate_path_animations, CubeMITM. Concentric thin rings represent BFS depth; prior frontiers turn grey; a highlighted path consists of individual vertices and edges; the cube stays small and walks along the traced path.

The reference explains meet-in-the-middle solving of one cube. The film separately explains the 2010 universal 20-move proof using the original cube20.org and Kociemba sources.
