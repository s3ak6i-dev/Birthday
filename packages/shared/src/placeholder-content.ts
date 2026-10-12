// PLACEHOLDER content for local testing only. NOT the real content
// pipeline (packages/content/src/*/*.json, still empty) and these items
// carry no real source - do not treat them as reviewed or accurate (see
// masterdoc.md section 5.3/5.4, and section 11 item 9). Swap these for
// real pack JSON once that content is authored and sourced.
//
// Lives here (not in apps/web, where it originally did) specifically so
// apps/rooms can import the same data the client used to simulate games
// against - the Durable Object needs *something* to call engine.init()
// with, and the real content packs don't exist yet.
import type { GuessCard } from "./games/guess-the-diagnosis/types";
import type { TriageSpectrumCard } from "./games/triage-dial/types";
import type { WordleEntry } from "./games/wordle/types";

export const PLACEHOLDER_DECK: GuessCard[] = [
  { id: "1", name: "Common cold", specialty: "General", tags: ["cough", "fatigue"] },
  { id: "2", name: "Influenza", specialty: "General", tags: ["fever", "cough", "fatigue"] },
  { id: "3", name: "Migraine", specialty: "General", tags: ["pain", "chronic"] },
  { id: "4", name: "Appendicitis", specialty: "General", tags: ["pain", "emergency", "fever"] },
  { id: "5", name: "Asthma", specialty: "General", tags: ["chronic", "cough"] },
  { id: "6", name: "Chickenpox", specialty: "Pediatrics", tags: ["rash", "fever", "pediatric"] },
  { id: "7", name: "Hand, foot and mouth disease", specialty: "Pediatrics", tags: ["rash", "fever", "pediatric"] },
  { id: "8", name: "Croup", specialty: "Pediatrics", tags: ["cough", "fever", "pediatric"] },
  { id: "9", name: "Ectopic pregnancy", specialty: "OB-GYN", tags: ["pain", "emergency"] },
  { id: "10", name: "Preeclampsia", specialty: "OB-GYN", tags: ["chronic", "emergency"] },
  { id: "11", name: "Morning sickness", specialty: "OB-GYN", tags: ["nausea", "chronic"] },
  { id: "12", name: "Endometriosis", specialty: "OB-GYN", tags: ["pain", "chronic"] },
  { id: "13", name: "Urinary tract infection", specialty: "General", tags: ["pain", "fever"] },
  { id: "14", name: "Gastroenteritis", specialty: "General", tags: ["nausea", "fever"] },
  { id: "15", name: "Angina", specialty: "Cardiology", tags: ["pain", "chronic"] },
  { id: "16", name: "Arrhythmia", specialty: "Cardiology", tags: ["chronic"] },
  { id: "17", name: "Hypertension", specialty: "Cardiology", tags: ["chronic"] },
  { id: "18", name: "Heart attack", specialty: "Cardiology", tags: ["pain", "emergency"] },
  { id: "19", name: "Anaphylaxis", specialty: "General", tags: ["emergency", "rash"] },
  { id: "20", name: "Contact dermatitis", specialty: "General", tags: ["rash", "chronic"] },
  { id: "21", name: "Iron deficiency anemia", specialty: "General", tags: ["fatigue", "chronic"] },
  { id: "22", name: "Hypothyroidism", specialty: "General", tags: ["fatigue", "chronic"] },
  { id: "23", name: "Gestational diabetes", specialty: "OB-GYN", tags: ["chronic", "pediatric"] },
  { id: "24", name: "Mastitis", specialty: "OB-GYN", tags: ["pain", "fever"] },
];

export const PLACEHOLDER_SPECTRUMS: TriageSpectrumCard[] = [
  { id: "1", leftLabel: "Can wait", rightLabel: "Needs theatre now", category: "General" },
  { id: "2", leftLabel: "Reassure and send home", rightLabel: "Admit immediately", category: "General" },
  { id: "3", leftLabel: "Mildly annoying", rightLabel: "Worst pain of their life", category: "General" },
  { id: "4", leftLabel: "Watch and wait", rightLabel: "Call an ambulance", category: "General" },
  { id: "5", leftLabel: "Over-the-counter fix", rightLabel: "Needs a specialist", category: "General" },
  { id: "6", leftLabel: "Totally benign", rightLabel: "Red flag symptom", category: "General" },
  { id: "7", leftLabel: "Routine checkup", rightLabel: "Emergency room", category: "General" },
  { id: "8", leftLabel: "Common cold territory", rightLabel: "Call in the specialists", category: "General" },
  { id: "9", leftLabel: "Normal newborn fussiness", rightLabel: "Straight to the NICU", category: "Pediatrics" },
  { id: "10", leftLabel: "Growing pains", rightLabel: "Get an X-ray now", category: "Pediatrics" },
  { id: "11", leftLabel: "Toddler being a toddler", rightLabel: "Call poison control", category: "Pediatrics" },
  { id: "12", leftLabel: "Mild fever, fluids and rest", rightLabel: "Febrile seizure risk", category: "Pediatrics" },
  { id: "13", leftLabel: "Normal first trimester symptom", rightLabel: "Call the OB immediately", category: "OB-GYN" },
  { id: "14", leftLabel: "Routine prenatal check", rightLabel: "Emergency C-section", category: "OB-GYN" },
  { id: "15", leftLabel: "Braxton Hicks", rightLabel: "Active labor, go now", category: "OB-GYN" },
  { id: "16", leftLabel: "Totally normal cycle variation", rightLabel: "See a gynecologist soon", category: "OB-GYN" },
  { id: "17", leftLabel: "Harmless heart flutter", rightLabel: "Call 911 immediately", category: "Cardiology" },
  { id: "18", leftLabel: "Deconditioned and out of shape", rightLabel: "Heart failure symptoms", category: "Cardiology" },
  { id: "19", leftLabel: "Normal post-exercise soreness", rightLabel: "Possible heart attack", category: "Cardiology" },
  { id: "20", leftLabel: "White coat anxiety", rightLabel: "Hypertensive emergency", category: "Cardiology" },
  { id: "21", leftLabel: "Lifestyle tweak will fix it", rightLabel: "Needs medication today", category: "General" },
  { id: "22", leftLabel: "Minor allergic itch", rightLabel: "Anaphylaxis, use the EpiPen", category: "General" },
  { id: "23", leftLabel: "Dehydration headache", rightLabel: "Possible stroke", category: "General" },
  { id: "24", leftLabel: "Normal post-op grogginess", rightLabel: "Call the surgeon now", category: "General" },
];

export const PLACEHOLDER_ENTRIES: WordleEntry[] = [
  { word: "FEVER", definition: "An elevated body temperature, usually a sign the immune system is fighting something", pack: "General", source: "placeholder" },
  { word: "ULCER", definition: "An open sore on skin or mucous membrane", pack: "General", source: "placeholder" },
  { word: "NERVE", definition: "A bundle of fibers that carries signals between the brain and the body", pack: "General", source: "placeholder" },
  { word: "PULSE", definition: "The rhythmic expansion of an artery, felt with each heartbeat", pack: "General", source: "placeholder" },
  { word: "VIRUS", definition: "A microscopic infectious agent that replicates inside living cells", pack: "General", source: "placeholder" },
  { word: "TOXIN", definition: "A poisonous substance produced by a living organism", pack: "General", source: "placeholder" },
  { word: "WOUND", definition: "An injury that breaks the skin or another body tissue", pack: "General", source: "placeholder" },
  { word: "LABOR", definition: "The process of childbirth, from contractions to delivery", pack: "OB-GYN", source: "placeholder" },
  { word: "NATAL", definition: "Relating to birth or the time just after it", pack: "OB-GYN", source: "placeholder" },
  { word: "OVARY", definition: "The organ that produces eggs and sex hormones in people with a uterus", pack: "OB-GYN", source: "placeholder" },
  { word: "FETUS", definition: "A developing human from about 8 weeks after fertilization until birth", pack: "OB-GYN", source: "placeholder" },
  { word: "VULVA", definition: "The external part of the female genitalia", pack: "OB-GYN", source: "placeholder" },
  { word: "DRUGS", definition: "Substances used to diagnose, treat, or prevent disease", pack: "Pharmacology", source: "placeholder" },
  { word: "DOSES", definition: "Measured amounts of a medication taken at one time", pack: "Pharmacology", source: "placeholder" },
  { word: "OPIUM", definition: "A narcotic drug derived from the poppy plant, the source of many painkillers", pack: "Pharmacology", source: "placeholder" },
  { word: "PILLS", definition: "Small round tablets or capsules of medicine", pack: "Pharmacology", source: "placeholder" },
  { word: "FEMUR", definition: "The thigh bone - the longest and strongest bone in the body", pack: "Anatomy", source: "placeholder" },
  { word: "SPINE", definition: "The column of vertebrae running down the back, protecting the spinal cord", pack: "Anatomy", source: "placeholder" },
  { word: "LIVER", definition: "The large organ that filters blood and processes nutrients and toxins", pack: "Anatomy", source: "placeholder" },
  { word: "HEART", definition: "The muscular organ that pumps blood through the body", pack: "Anatomy", source: "placeholder" },
  { word: "BRAIN", definition: "The organ in the skull that controls thought, memory, and the nervous system", pack: "Anatomy", source: "placeholder" },
  { word: "COLON", definition: "The large intestine, where water is absorbed from digested food", pack: "Anatomy", source: "placeholder" },
  { word: "CROUP", definition: "A childhood respiratory infection with a distinctive barking cough", pack: "Pediatrics", source: "placeholder" },
  { word: "LATCH", definition: "How a baby attaches to the breast to feed", pack: "Pediatrics", source: "placeholder" },
];
