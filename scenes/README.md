# Scenes

Ink (`.ink`) source files for the story layer. See masterdoc.md section 2.5
(story layer, scene triggers, cast) and section 4.8 (story engine).

One knot per scene, named by scene ID; scene-level tags set `bg`, `music`,
and `time`; per-line tags set `speaker` and `expr`. `triage_intro.ink` is the
one worked example already in the spec - everything else in the scene
trigger table (section 2.5) still needs writing:

- `intro` - first login on each device
- `tut_guess`, `tut_triage`, `tut_wordle`, `tut_codered`, `tut_cases` - first visit to each game
- `rank_up_1..4`, `bond_1..5` - progression milestones
- `case_1_intro..case_8_intro`, `case_1_outro..case_8_outro` - Case Files (v2)
- `streak_7`, `streak_30`, `finale`

Compiled to JSON by `inkjs` at build time (section 4.8) - not wired into the
build yet (M3, section 7.2 "Scene player + Ink pipeline").
