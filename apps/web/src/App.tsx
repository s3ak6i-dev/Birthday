import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Lounge } from "./routes/Lounge";
import { AvatarSetup } from "./routes/AvatarSetup";
import { GameIntro } from "./routes/GameIntro";
import { GuessTheDiagnosisIntro } from "./routes/GuessTheDiagnosisIntro";
import { GuessTheDiagnosisBoard } from "./routes/GuessTheDiagnosisBoard";
import { WaitingRoom } from "./routes/WaitingRoom";
import { TriageDialIntro } from "./routes/TriageDialIntro";
import { TriageDialBoard } from "./routes/TriageDialBoard";
import { CodeRedIntro } from "./routes/CodeRedIntro";
import { WordleIntro } from "./routes/WordleIntro";
import { WordleBoard } from "./routes/WordleBoard";
import { GamesList } from "./routes/GamesList";
import { StickerAlbum } from "./routes/StickerAlbum";
import { Stats } from "./routes/Stats";
import { Settings } from "./routes/Settings";
import { NotFound } from "./routes/NotFound";

// Route list matches the screen inventory in masterdoc.md section 2.2.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lounge />} />
        <Route path="/avatar" element={<AvatarSetup />} />
        <Route path="/g/guess-the-diagnosis" element={<GuessTheDiagnosisIntro />} />
        <Route path="/g/guess-the-diagnosis/play" element={<GuessTheDiagnosisBoard />} />
        <Route path="/g/triage-dial" element={<TriageDialIntro />} />
        <Route path="/g/triage-dial/play" element={<TriageDialBoard />} />
        <Route path="/g/code-red" element={<CodeRedIntro />} />
        {/* Wordle is the one game masterdoc.md gives its own top-level route
            (S16/S17: `/wordle`, not `/g/wordle`) rather than routing it
            through the generic `/g/:game` namespace like the others. A
            bare `/g/wordle` has no dedicated screen of its own, so without
            this it falls through to the generic `/g/:game` catch-all
            (GameIntro.tsx's placeholder stub) below - confirmed live, this
            is exactly the broken-looking page a stale link/bookmark/typed
            URL would land on. Redirecting it here instead of just fixing
            every known link that points at it (already done once, for
            WaitingRoom.tsx's two "Back to game" links) closes the whole
            class of it, not just the instances found so far. */}
        <Route path="/wordle" element={<WordleIntro />} />
        <Route path="/wordle/play" element={<WordleBoard />} />
        <Route path="/g/wordle" element={<Navigate to="/wordle" replace />} />
        {/* S08 waiting room / live room, per masterdoc.md's screen inventory
            path `/g/:game/:code`. React Router v6 ranks static segments
            above dynamic ones at the same position, so the literal
            `/play` routes above still win over this for those exact
            paths - verified by actually loading both in the browser,
            not just assumed from the ranking docs. */}
        <Route path="/g/:game/:code" element={<WaitingRoom />} />
        <Route path="/g/:game" element={<GameIntro />} />
        <Route path="/games" element={<GamesList />} />
        <Route path="/album" element={<StickerAlbum />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
