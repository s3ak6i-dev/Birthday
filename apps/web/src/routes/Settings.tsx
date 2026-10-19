// S25 Settings (masterdoc.md section 2.2, FR-110). Replaces the generic
// Placeholder this route used to render.
//
// FR-110 lists eight categories: sound effects, music volume, reduced
// motion, text size, dialogue speed, colorblind shape cues, haptics,
// display name, and avatar. Four of those already have real systems
// behind them - sound/music (@ward-games/ui's sfx.ts/music.ts), reduced
// motion (motion.ts, added alongside this page), and display name/avatar
// (the `profiles` table / Avatar Setup) - so this page reads and writes
// those directly. The other four (text size, dialogue speed, colorblind
// cues, haptics) have no backing system anywhere yet; this page still
// gives them real controls that persist a value (lib/settings.ts), on
// purpose, ahead of actually wiring them into the scene player/games -
// see that file's header comment for what "wiring them in" would mean for
// each one.
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  PixelButton,
  SettingsIcon,
  getMusicVolume,
  getReducedMotionSetting,
  isMusicMuted,
  isSfxMuted,
  palette,
  setMusicVolume,
  setReducedMotionSetting,
  toggleMusicMuted,
  toggleSfxMuted,
  type ReducedMotionSetting,
} from "@ward-games/ui";
import { supabase } from "../lib/supabase";
import { characterForEmail } from "../lib/characters";
import { useProfiles } from "../lib/use-profiles";
import { sfxConfirm, sfxError, sfxToggle } from "../lib/sfx";
import {
  getColorblindCues,
  getDialogueSpeed,
  getHaptics,
  getTextSize,
  setColorblindCues,
  setDialogueSpeed,
  setHaptics,
  setTextSize,
  type DialogueSpeed,
  type TextSize,
} from "../lib/settings";

export function Settings() {
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [selfEmail, setSelfEmail] = useState<string | null>(null);
  const { byId: profileNameById, loading: profilesLoading } = useProfiles();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSelfUserId(data.session?.user.id ?? null);
      setSelfEmail(data.session?.user.email ?? null);
    });
  }, []);

  const selfCharacter = characterForEmail(selfEmail);

  return (
    <main style={{ padding: "28px 24px 56px", color: palette.white, background: palette.ink, minHeight: "100vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p>
          <Link to="/" style={{ color: palette.white, opacity: 0.85 }}>
            ← Back to the Lounge
          </Link>
        </p>

        <header style={{ margin: "10px 0 26px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", width: 30, height: 30 }}>
            <SettingsIcon />
          </span>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 6vw, 38px)" }}>Settings</h1>
        </header>

        <ProfileSection
          selfUserId={selfUserId}
          currentName={selfUserId ? (profileNameById[selfUserId] ?? selfCharacter?.label) : undefined}
          loading={profilesLoading}
        />
        <SoundSection />
        <AccessibilitySection />
      </div>
    </main>
  );
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        border: `1px solid ${palette.deepViolet}`,
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        padding: "16px 18px",
        marginBottom: 16,
      }}
    >
      <h2 style={{ margin: "0 0 12px", fontSize: 15, opacity: 0.9 }}>{title}</h2>
      {children}
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        rowGap: 8,
        columnGap: 14,
        padding: "10px 0",
        borderTop: `1px solid rgba(255,255,255,0.06)`,
      }}
    >
      {/* flex-basis (not just flex:1) so this drops to its own full-width
          line instead of squeezing to a sliver next to a wide segmented
          control - confirmed necessary at phone width (390px), where
          "Dialogue speed" + its 4-option control used to fight for the
          same row and both wrapped mid-word. */}
      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>{label}</div>
        {description && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ marginLeft: "auto" }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => {
        sfxToggle();
        onToggle();
      }}
      style={{
        flex: "0 0 auto",
        width: 46,
        height: 26,
        borderRadius: 999,
        border: `2px solid ${palette.ink}`,
        background: on ? palette.deepAmethyst : "rgba(255,255,255,0.12)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        transition: "background 150ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: palette.white,
          transition: "left 150ms ease",
        }}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => {
              sfxToggle();
              onChange(opt.value);
            }}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${active ? palette.amethyst : palette.deepViolet}`,
              background: active ? palette.deepAmethyst : "transparent",
              color: palette.white,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfileSection({
  selfUserId,
  currentName,
  loading,
}: {
  selfUserId: string | null;
  currentName: string | undefined;
  loading: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (initialized || loading || currentName === undefined) return;
    setDraft(currentName);
    setInitialized(true);
  }, [initialized, loading, currentName]);

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || !selfUserId || trimmed === currentName) return;
    setStatus("saving");
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("user_id", selfUserId);
    if (error) {
      sfxError();
      setStatus("error");
      return;
    }
    sfxConfirm();
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  const dirty = initialized && draft.trim() && draft.trim() !== currentName;

  return (
    <SettingsCard title="Profile">
      <SettingRow label="Display name" description="Shown in chat and to your partner in every room.">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={24}
            placeholder={loading ? "Loading..." : "Name"}
            style={{
              width: 140,
              background: "rgba(255,255,255,0.08)",
              border: `1px solid rgba(255,255,255,0.2)`,
              borderRadius: 8,
              padding: "6px 10px",
              color: palette.white,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          <PixelButton onClick={handleSave} disabled={!dirty || status === "saving"} style={{ padding: "6px 12px", minHeight: 0 }}>
            {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : "Save"}
          </PixelButton>
        </div>
      </SettingRow>
      {status === "error" && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.coral }}>Couldn't save that - try again.</p>
      )}
      <SettingRow label="Avatar" description="Scrubs color, coat, and sprite.">
        <Link to="/avatar">
          <PixelButton style={{ padding: "6px 12px", minHeight: 0 }}>Edit avatar</PixelButton>
        </Link>
      </SettingRow>
    </SettingsCard>
  );
}

function SoundSection() {
  const [sfxMuted, setSfxMutedState] = useState(() => isSfxMuted());
  const [musicMuted, setMusicMutedState] = useState(() => isMusicMuted());
  const [musicVolume, setMusicVolumeState] = useState(() => Math.round(getMusicVolume() * 100));

  return (
    <SettingsCard title="Sound">
      <SettingRow label="Sound effects" description="Clicks, taps, game feedback.">
        <Toggle on={!sfxMuted} onToggle={() => setSfxMutedState(toggleSfxMuted())} />
      </SettingRow>
      <SettingRow label="Music" description="The Lounge's background loop.">
        <Toggle on={!musicMuted} onToggle={() => setMusicMutedState(toggleMusicMuted())} />
      </SettingRow>
      <SettingRow label="Music volume">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={musicVolume}
            onChange={(e) => {
              const next = Number(e.target.value);
              setMusicVolumeState(next);
              setMusicVolume(next / 100);
            }}
            style={{ width: 110, accentColor: palette.amethyst }}
          />
          <span style={{ fontSize: 12, opacity: 0.7, width: 32, textAlign: "right" }}>{musicVolume}%</span>
        </div>
      </SettingRow>
    </SettingsCard>
  );
}

const REDUCED_MOTION_OPTIONS = [
  { value: "system" as const, label: "System" },
  { value: "on" as const, label: "On" },
  { value: "off" as const, label: "Off" },
];

const TEXT_SIZE_OPTIONS = [
  { value: "S" as const, label: "S" },
  { value: "M" as const, label: "M" },
  { value: "L" as const, label: "L" },
];

const DIALOGUE_SPEED_OPTIONS = [
  { value: "slow" as const, label: "Slow" },
  { value: "normal" as const, label: "Normal" },
  { value: "fast" as const, label: "Fast" },
  { value: "instant" as const, label: "Instant" },
];

function AccessibilitySection() {
  const [reducedMotion, setReducedMotionState] = useState<ReducedMotionSetting>(() => getReducedMotionSetting());
  const [textSize, setTextSizeState] = useState<TextSize>(() => getTextSize());
  const [dialogueSpeed, setDialogueSpeedState] = useState<DialogueSpeed>(() => getDialogueSpeed());
  const [colorblindCues, setColorblindCuesState] = useState(() => getColorblindCues());
  const [haptics, setHapticsState] = useState(() => getHaptics());

  return (
    <SettingsCard title="Accessibility">
      <SettingRow label="Reduced motion" description="Window flicker, dust motes, card pop-ins.">
        <SegmentedControl
          value={reducedMotion}
          options={REDUCED_MOTION_OPTIONS}
          onChange={(v) => {
            setReducedMotionState(v);
            setReducedMotionSetting(v);
          }}
        />
      </SettingRow>
      <SettingRow label="Text size">
        <SegmentedControl
          value={textSize}
          options={TEXT_SIZE_OPTIONS}
          onChange={(v) => {
            setTextSizeState(v);
            setTextSize(v);
          }}
        />
      </SettingRow>
      <SettingRow label="Dialogue speed" description="Gyna's typewriter text.">
        <SegmentedControl
          value={dialogueSpeed}
          options={DIALOGUE_SPEED_OPTIONS}
          onChange={(v) => {
            setDialogueSpeedState(v);
            setDialogueSpeed(v);
          }}
        />
      </SettingRow>
      <SettingRow label="Colorblind-friendly shapes" description="Extra symbols on Wordle tiles, not just color.">
        <Toggle
          on={colorblindCues}
          onToggle={() => {
            const next = !colorblindCues;
            setColorblindCuesState(next);
            setColorblindCues(next);
          }}
        />
      </SettingRow>
      <SettingRow label="Haptics" description="Vibration on supported phones.">
        <Toggle
          on={haptics}
          onToggle={() => {
            const next = !haptics;
            setHapticsState(next);
            setHaptics(next);
          }}
        />
      </SettingRow>
    </SettingsCard>
  );
}
