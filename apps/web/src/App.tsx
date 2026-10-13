import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Gate } from "./routes/Gate";
import { Lounge } from "./routes/Lounge";
import { AvatarSetup } from "./routes/AvatarSetup";
import { GameIntro } from "./routes/GameIntro";
import { GuessTheDiagnosisIntro } from "./routes/GuessTheDiagnosisIntro";
import { GuessTheDiagnosisBoard } from "./routes/GuessTheDiagnosisBoard";
import { WaitingRoom } from "./routes/WaitingRoom";
import { TriageDialIntro } from "./routes/TriageDialIntro";
import { TriageDialBoard } from "./routes/TriageDialBoard";
import { WordleIntro } from "./routes/WordleIntro";
import { WordleBoard } from "./routes/WordleBoard";
import { GamesList } from "./routes/GamesList";
import { StickerAlbum } from "./routes/StickerAlbum";
import { Stats } from "./routes/Stats";
import { Placeholder } from "./routes/Placeholder";
import { NotFound } from "./routes/NotFound";

// Route list matches the screen inventory in masterdoc.md section 2.2.
// /settings is still a placeholder so the persistent nav (FR-11) never
// 404s while that screen is pending - see TODO.md M4.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/gate" element={<Gate />} />
        <Route path="/" element={<Lounge />} />
        <Route path="/avatar" element={<AvatarSetup />} />
        <Route path="/g/guess-the-diagnosis" element={<GuessTheDiagnosisIntro />} />
        <Route path="/g/guess-the-diagnosis/play" element={<GuessTheDiagnosisBoard />} />
        <Route path="/g/triage-dial" element={<TriageDialIntro />} />
        <Route path="/g/triage-dial/play" element={<TriageDialBoard />} />
        {/* Wordle is the one game masterdoc.md gives its own top-level route
            (S16/S17: `/wordle`, not `/g/wordle`) rather than routing it
            through the generic `/g/:game` namespace like the others. */}
        <Route path="/wordle" element={<WordleIntro />} />
        <Route path="/wordle/play" element={<WordleBoard />} />
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
        <Route path="/settings" element={<Placeholder title="Settings" />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
