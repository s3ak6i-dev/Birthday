// Reusable visual-novel scene player. See masterdoc.md section 2.5 (story
// layer) and FR-80/81 - portrait, name tag, typewriter dialogue box, log-free
// for now, skip. Used for every game's tutorial (`tut_*`) and later every
// story beat, so it's one component, not rebuilt per screen.
//
// Content model: `lines` is a plain array, not real compiled Ink. Section
// 4.8's Ink -> JSON pipeline is still open (TODO.md M3); this shape is
// deliberately close to what that pipeline will eventually hand the player,
// so swapping the data source later shouldn't require touching this file.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { palette } from "../tokens";
import { PortraitPlaceholder } from "./PortraitPlaceholder";
import { PixelButton } from "./PixelButton";

export interface DialogueLine {
  speaker: string;
  text: string;
  /** Expression tag for future portrait swapping (section 2.5 Ink conventions, `# expr:happy`). Unused while portraits are placeholders. */
  expr?: string;
  /** Optional illustration shown beside the portrait for just this line - e.g. a small flashcard-style icon visualizing what's being explained (tutorial beats). Swaps in/out per line, not per scene. */
  card?: string;
}

export interface DialogueSceneProps {
  lines: DialogueLine[];
  onComplete: () => void;
  onSkip?: () => void;
  /** Static override - skips per-line portrait resolution entirely. Prefer `portraits` below for a real scene with more than one line/expression. */
  portrait?: ReactNode;
  /**
   * speaker (case-insensitive) -> expr -> image URL, e.g.
   * `{ gyna: { default: "/gyna/neutral.png", smug: "/gyna/wink.png" } }`.
   * Looked up per line as speaker+expr, falling back to that speaker's
   * "default", then to the generic PortraitPlaceholder if the speaker
   * isn't in the table at all (e.g. a cast member whose art doesn't exist
   * yet - section 11 items 3-4).
   */
  portraits?: Record<string, Record<string, string>>;
  background?: string;
  /** Skip the portrait entirely - for scenes where the speaker is already baked into the `background` art. */
  hidePortrait?: boolean;
  /**
   * Pin the portrait to a spot in the `background` art instead of the
   * default row above the dialogue box - e.g. `{ left: "76%", top: "38%",
   * width: "15%" }` to sit it right where a character stands in the scene.
   * Takes `top`/`left`/`right`/`bottom`/`width`/`height` as CSS values;
   * mutually exclusive with `hidePortrait`.
   */
  portraitPosition?: Pick<CSSProperties, "top" | "left" | "right" | "bottom" | "width" | "height">;
}

function resolvePortraitSrc(line: DialogueLine, portraits?: Record<string, Record<string, string>>): string | undefined {
  const table = portraits?.[line.speaker.toLowerCase()];
  if (!table) return undefined;
  return table[line.expr ?? "default"] ?? table.default;
}

const MS_PER_CHAR = 22; // TODO (M4, FR-110): read from the dialogue-speed setting once Settings exists

export function DialogueScene({
  lines,
  onComplete,
  onSkip,
  portrait,
  portraits,
  background,
  hidePortrait,
  portraitPosition,
}: DialogueSceneProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charsShown, setCharsShown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const line = lines[lineIndex];
  const fullyShown = line !== undefined && charsShown >= line.text.length;

  useEffect(() => {
    setCharsShown(0);
  }, [lineIndex]);

  useEffect(() => {
    if (!line || charsShown >= line.text.length) return;
    timerRef.current = setTimeout(() => setCharsShown((c) => c + 1), MS_PER_CHAR);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [line, charsShown]);

  if (!line) return null;

  function renderPortrait(imgStyle: CSSProperties, placeholderSize: number) {
    return (
      portrait ??
      (() => {
        const src = resolvePortraitSrc(line, portraits);
        return src ? <img src={src} alt="" style={imgStyle} /> : <PortraitPlaceholder size={placeholderSize} />;
      })()
    );
  }

  function advance() {
    if (!fullyShown) {
      setCharsShown(line!.text.length); // tap finishes the typewriter instantly
      return;
    }
    if (lineIndex + 1 >= lines.length) {
      onComplete();
    } else {
      setLineIndex((i) => i + 1);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Scene"
      onClick={advance}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: background ?? palette.nightViolet,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        cursor: "pointer",
        color: palette.white,
      }}
    >
      {onSkip && (
        <PixelButton
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          style={{ position: "absolute", top: 16, right: 16 }}
        >
          Skip
        </PixelButton>
      )}

      {!hidePortrait && portraitPosition && (
        <div style={{ position: "absolute", ...portraitPosition }}>
          {renderPortrait({ width: "100%", height: "100%", objectFit: "contain" }, 140)}
        </div>
      )}

      {!hidePortrait && !portraitPosition && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 24, padding: "0 24px" }}>
          {renderPortrait({ width: 140, height: 140, objectFit: "contain" }, 140)}
          {line.card && (
            <img
              key={`${lineIndex}-${line.card}`}
              src={line.card}
              alt=""
              className="ward-dialogue-card"
              style={{ height: 170, width: "auto", objectFit: "contain" }}
            />
          )}
        </div>
      )}

      <div
        style={{
          margin: 24,
          marginTop: 12,
          background: palette.violet,
          border: `3px solid ${palette.ink}`,
          borderRadius: 8,
          padding: "12px 20px",
          minHeight: 96,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: palette.ink,
            padding: "2px 10px",
            borderRadius: 4,
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          {line.speaker}
        </div>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.4, minHeight: "2.8em" }}>
          {line.text.slice(0, charsShown)}
        </p>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7, textAlign: "right" }}>
          {fullyShown ? (lineIndex + 1 >= lines.length ? "tap to continue ›" : "tap to continue ›") : "tap to skip ahead"}
        </p>
      </div>
    </div>
  );
}
