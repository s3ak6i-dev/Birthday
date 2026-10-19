// S03 Avatar setup. See masterdoc.md FR-90 and screen inventory section
// 2.2. "Faces and hair are fixed" - this screen only ever customizes
// scrubs color; see lib/avatar-options.ts for the scope note on why
// that's a set of pre-generated sprites rather than live CSS recoloring.
// The 5-accessory picker this screen used to have was removed earlier,
// then the coat toggle that sat alongside scrubs color was removed on
// request too (see avatar-options.ts's own comment on that) - down to one
// real choice now, so the layout was redone around that: a single
// centered column (character picker, then a bigger preview, then the
// color strip right under it) instead of the old side-by-side
// preview-plus-panel split, which left a tall mostly-empty panel next to
// the preview once "Coat" was the only other section in it.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PixelButton, palette } from "@ward-games/ui";
import { CHARACTERS, characterForEmail, type CharacterLogin } from "../lib/characters";
import {
  SCRUB_COLORS,
  getAvatarSpriteSrc,
  loadAvatarConfig,
  saveAvatarConfig,
  type AvatarConfig,
  type CharacterId,
} from "../lib/avatar-options";
import { supabase } from "../lib/supabase";

// Natural aspect ratio (width/height) of each character's sprite -
// hardcoded from the actual exported art rather than measured at runtime,
// to avoid an async image-load/layout-shift step just to size the preview
// frame.
const SPRITE_ASPECT: Record<CharacterId, number> = {
  lakshmi: 554 / 1468,
  surya: 569 / 1494,
};

// Reuses the Lounge's own backdrop rather than generating a dedicated room
// for this screen - the look this screen was styled after is already
// basically the same cozy room (sofa+pet, sunset window, bookshelf, desk),
// so a second generation would just be redundant art spend.
const BACKDROP = "/lounge_dusk.png";

export function AvatarSetup() {
  const navigate = useNavigate();
  const [characterId, setCharacterId] = useState<CharacterId>("lakshmi");
  const [config, setConfig] = useState<AvatarConfig>(() => loadAvatarConfig("lakshmi"));

  // Default to whoever is actually signed in - Surya opening this screen
  // should land on Surya's own look, not always Lakshmi's - same
  // session-email -> characterForEmail lookup as the Lounge's profile
  // button. Only runs once on mount; picking the other person via the
  // character row above still works exactly as before.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const signedIn = characterForEmail(data.session?.user.email);
      if (signedIn) setCharacterId(signedIn.id);
    });
  }, []);

  useEffect(() => {
    setConfig(loadAvatarConfig(characterId));
  }, [characterId]);

  useEffect(() => {
    saveAvatarConfig(characterId, config);
  }, [characterId, config]);

  const character = CHARACTERS.find((c: CharacterLogin) => c.id === characterId)!;
  const spriteSrc = getAvatarSpriteSrc(characterId, config);
  const aspect = SPRITE_ASPECT[characterId];
  const selectedColor = SCRUB_COLORS.find((c) => c.id === config.scrubColorId) ?? SCRUB_COLORS[0]!;

  return (
    <main style={{ position: "relative", minHeight: "100vh", color: palette.white, padding: "24px 16px" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${BACKDROP})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,31,0.6)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>

        <h1
          style={{
            textAlign: "center",
            margin: "4px 0 4px",
            fontSize: "clamp(28px, 5vw, 40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <span aria-hidden style={{ opacity: 0.8, fontSize: "0.5em" }}>
            ✨
          </span>
          Avatar Setup
          <span aria-hidden style={{ opacity: 0.8, fontSize: "0.5em" }}>
            ✨
          </span>
        </h1>
        <p style={{ textAlign: "center", opacity: 0.85, fontSize: 13, margin: "0 0 22px" }}>
          Faces and hair are fixed - scrubs color is yours to pick.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
          {CHARACTERS.map((c: CharacterLogin) => {
            const selected = characterId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCharacterId(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 18px 6px 6px",
                  borderRadius: 999,
                  background: selected ? palette.violet : palette.coral,
                  border: `2px solid ${selected ? palette.white : palette.ink}`,
                  color: palette.white,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 15,
                }}
              >
                <img
                  src={c.bust}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    objectFit: "cover",
                    objectPosition: "center 15%",
                    border: `2px solid ${palette.ink}`,
                    background: palette.ink,
                  }}
                />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Single centered column - scrubs color is the only customization
            left now, so the old side-by-side preview+panel split just left
            a tall, mostly-empty panel once "Coat" was gone. The preview
            takes center stage and the color picker sits directly under it
            as one card, same visual weight as the rest of this screen's
            panels but without a second one competing for space. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div
            style={{
              position: "relative",
              height: "min(56vh, 460px)",
              aspectRatio: aspect,
              background: "rgba(20,16,31,0.55)",
              border: `3px solid ${palette.violet}`,
              borderRadius: 16,
              boxShadow: "0 0 48px rgba(160,108,213,0.22)",
            }}
          >
            <img
              src={spriteSrc}
              alt={character.label}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              width: "min(92vw, 420px)",
              background: "rgba(20,16,31,0.72)",
              border: `2px solid ${palette.deepViolet}`,
              borderRadius: 12,
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                margin: "0 0 2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span aria-hidden>🎨</span> Scrubs color
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: 12, opacity: 0.65 }}>{selectedColor.label}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {SCRUB_COLORS.map((c) => {
                const selected = config.scrubColorId === c.id;
                return (
                  <button
                    key={c.id}
                    title={c.label}
                    aria-label={c.label}
                    aria-pressed={selected}
                    onClick={() => setConfig((cfg) => ({ ...cfg, scrubColorId: c.id }))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: c.swatch,
                      border: `3px solid ${selected ? palette.white : palette.deepViolet}`,
                      boxShadow: selected ? `0 0 0 3px ${palette.amethyst}` : "none",
                      transform: selected ? "scale(1.08)" : "none",
                      transition: "transform 120ms ease, box-shadow 120ms ease",
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 28, paddingBottom: 12 }}>
          <PixelButton onClick={() => navigate("/")}>Confirm Look →</PixelButton>
        </div>
      </div>
    </main>
  );
}
