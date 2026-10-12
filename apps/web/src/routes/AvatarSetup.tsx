// S03 Avatar setup. See masterdoc.md FR-90 and screen inventory section
// 2.2. "Faces and hair are fixed" - this screen only ever customizes
// scrubs color, coat on/off, and the 5 accessory slots; see
// lib/avatar-options.ts for the scope note on why "scrubs color" is a set
// of pre-generated sprite pairs rather than live CSS recoloring.
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PixelButton, palette } from "@ward-games/ui";
import { CHARACTERS, type CharacterLogin } from "../lib/characters";
import {
  ACCESSORIES,
  SCRUB_COLORS,
  loadAvatarConfig,
  saveAvatarConfig,
  type AvatarConfig,
  type CharacterId,
} from "../lib/avatar-options";

// Natural aspect ratio (width/height) of each sprite variant - the coat
// adds some width relative to height, so it isn't quite the same box as
// the scrubs-only sprite. Hardcoded from the actual exported art rather
// than measured at runtime, to avoid an async image-load/layout-shift step
// just to size the preview frame.
const SPRITE_ASPECT: Record<CharacterId, { scrubs: number; coat: number }> = {
  lakshmi: { scrubs: 554 / 1468, coat: 555 / 1463 },
  surya: { scrubs: 569 / 1494, coat: 575 / 1496 },
};

// Reuses the Lounge's own backdrop rather than generating a dedicated room
// for this screen - the look this screen was styled after is already
// basically the same cozy room (sofa+pet, sunset window, bookshelf, desk),
// so a second generation would just be redundant art spend.
const BACKDROP = "/lounge_dusk.png";

function PanelSection({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(20,16,31,0.72)",
        border: `2px solid ${palette.deepViolet}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <h2 style={{ fontSize: 14, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

export function AvatarSetup() {
  const navigate = useNavigate();
  const [characterId, setCharacterId] = useState<CharacterId>("lakshmi");
  const [config, setConfig] = useState<AvatarConfig>(() => loadAvatarConfig("lakshmi"));

  useEffect(() => {
    setConfig(loadAvatarConfig(characterId));
  }, [characterId]);

  useEffect(() => {
    saveAvatarConfig(characterId, config);
  }, [characterId, config]);

  const character = CHARACTERS.find((c: CharacterLogin) => c.id === characterId)!;
  const scrubColor = SCRUB_COLORS.find((c) => c.id === config.scrubColorId) ?? SCRUB_COLORS[0]!;
  const spriteSrc = config.coatOn ? scrubColor.images[characterId].coat : scrubColor.images[characterId].scrubs;
  const aspect = config.coatOn ? SPRITE_ASPECT[characterId].coat : SPRITE_ASPECT[characterId].scrubs;

  function toggleAccessory(id: (typeof ACCESSORIES)[number]["id"]) {
    setConfig((c) => ({ ...c, accessories: { ...c.accessories, [id]: !c.accessories[id] } }));
  }

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
          Faces and hair are fixed - scrubs, coat, and accessories are yours to pick.
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

        <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
          {/* Live preview */}
          <div
            style={{
              position: "relative",
              height: "min(60vh, 520px)",
              aspectRatio: aspect,
              background: "rgba(20,16,31,0.55)",
              border: `3px solid ${palette.violet}`,
              borderRadius: 16,
            }}
          >
            <img
              src={spriteSrc}
              alt={character.label}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            {ACCESSORIES.map((acc) => {
              if (!config.accessories[acc.id]) return null;
              const pos = acc.position[characterId];
              return (
                <img
                  key={acc.id}
                  src={acc.image}
                  alt=""
                  style={{ position: "absolute", left: pos.left, top: pos.top, width: pos.width, height: "auto" }}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display: "grid", gap: 16, minWidth: 280, alignContent: "start" }}>
            <PanelSection icon="🎨" title="Scrubs color">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {SCRUB_COLORS.map((c) => (
                  <button
                    key={c.id}
                    title={c.label}
                    onClick={() => setConfig((cfg) => ({ ...cfg, scrubColorId: c.id }))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: c.swatch,
                      border: `3px solid ${config.scrubColorId === c.id ? palette.white : palette.deepViolet}`,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </PanelSection>

            <PanelSection icon="🥼" title="Coat">
              <PixelButton
                variant={config.coatOn ? "primary" : "danger"}
                onClick={() => setConfig((c) => ({ ...c, coatOn: !c.coatOn }))}
              >
                {config.coatOn ? "Coat on" : "Coat off"}
              </PixelButton>
            </PanelSection>

            <PanelSection icon="✨" title="Accessories">
              <div style={{ display: "grid", gap: 8 }}>
                {ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => toggleAccessory(acc.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 10px",
                      background: config.accessories[acc.id] ? palette.violet : "transparent",
                      border: `2px solid ${config.accessories[acc.id] ? palette.white : palette.deepViolet}`,
                      borderRadius: 8,
                      color: palette.white,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <img src={acc.image} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    {acc.label}
                  </button>
                ))}
              </div>
            </PanelSection>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 28, paddingBottom: 12 }}>
          <PixelButton onClick={() => navigate("/")}>Confirm Look →</PixelButton>
        </div>
      </div>
    </main>
  );
}
