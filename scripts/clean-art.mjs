#!/usr/bin/env node
// Post-processing pipeline for generated art. See masterdoc.md section 6.5.
//
// TODO (backlog, section 7.2 "v1 art"):
//  - resize to the intended integer pixel grid with nearest-neighbor scaling
//  - snap every pixel to the nearest color in art/palette.json
//  - strip stray anti-aliased edge pixels introduced by the image model
//  - export a cropped PNG to art/export/<same-relative-path>
//
// Likely implementation: the `sharp` package for resizing/decoding plus a
// small nearest-palette-color function reading art/palette.json. Not wired
// up yet - this is a placeholder so the pipeline's shape is agreed before
// bulk art generation starts.

console.log("TODO: implement clean-art.mjs - see masterdoc.md section 6.5");
process.exit(1);
