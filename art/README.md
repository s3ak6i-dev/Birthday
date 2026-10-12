# Art

Source art (pre-export) and exported sprites/backgrounds. See masterdoc.md
section 6 for the full plan: style guide, palette, asset inventory, image
model prompt templates, and the cleanup/quantize pipeline (`scripts/clean-art.mjs`).

```
art/
  palette.json     the locked palette (keep in sync with packages/ui/src/tokens.ts)
  source/          raw image-model output, pre-cleanup (gitignored - large/WIP)
  export/          cleaned, quantized, game-ready assets (committed)
```

Nothing has been generated yet - this is a placeholder until M3/M5/M6 art
work starts (section 7.1).
