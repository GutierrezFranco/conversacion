// Transcripción palabra por palabra. Dos opciones:
//   TRANSCRIBER=elevenlabs (por defecto) → ElevenLabs Scribe: más preciso, se paga por uso
//   TRANSCRIBER=whisper                  → whisper.cpp en el mismo worker: gratis, algo más lento
// No limpiamos muletillas acá: Claude necesita verlas con sus tiempos para cortarlas.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "../lib/env";
import { run } from "./media";
import type { Word } from "./timeline";

export async function transcribe(videoOrAudio: string, onProgress?: (fraction: number) => void): Promise<Word[]> {
  return process.env.TRANSCRIBER === "whisper" ? transcribeWhisper(videoOrAudio, onProgress) : transcribeElevenLabs(videoOrAudio);
}

async function transcribeElevenLabs(input: string): Promise<Word[]> {
  const dir = await mkdtemp(join(tmpdir(), "stt-"));
  try {
    const audio = join(dir, "audio.mp3");
    await run("ffmpeg", ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio]);
    const client = new ElevenLabsClient({ apiKey: env("ELEVENLABS_API_KEY") });
    const res = await client.speechToText.convert({
      file: new Blob([await readFile(audio)], { type: "audio/mpeg" }),
      modelId: "scribe_v2",
      languageCode: "spa",
      timestampsGranularity: "word",
      diarize: false,
      tagAudioEvents: false,
    });
    return res.words
      .filter((w) => w.type === "word" && w.start !== undefined && w.end !== undefined)
      .map((w, i) => ({ i, text: w.text.trim(), start: w.start!, end: w.end! }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function transcribeWhisper(input: string, onProgress?: (fraction: number) => void): Promise<Word[]> {
  const dir = await mkdtemp(join(tmpdir(), "whisper-"));
  try {
    // whisper.cpp necesita WAV de 16 kHz mono.
    const wav = join(dir, "audio.wav");
    await run("ffmpeg", ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
    const out = join(dir, "out");
    await run(process.env.WHISPER_BIN ?? "whisper-cli", [
      "-m", process.env.WHISPER_MODEL ?? "/opt/whisper/ggml-small-q5_1.bin",
      "-f", wav,
      "-l", "es",
      // -ml 1 + -sow: un segmento por palabra, con su tiempo de inicio y fin.
      "-ml", "1", "-sow",
      "-oj", "-of", out,
      // -pp escribe "progress = 40%" a medida que avanza.
      "-pp",
      "-t", String(process.env.WHISPER_THREADS ?? 4),
    ], (chunk) => {
      const m = [...chunk.matchAll(/progress\s*=\s*(\d+)%/g)].pop();
      if (m) onProgress?.(Number(m[1]) / 100);
    });
    return parseWhisperJson(JSON.parse(await readFile(`${out}.json`, "utf8")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

type WhisperJson = { transcription: { offsets: { from: number; to: number }; text: string }[] };

// Convierte la salida de whisper.cpp (offsets en milisegundos) en palabras. Los signos sueltos
// ("," "?") se pegan a la palabra anterior y se descartan anotaciones como "[Música]".
export function parseWhisperJson(json: WhisperJson): Word[] {
  const words: Word[] = [];
  for (const seg of json.transcription ?? []) {
    const text = seg.text.trim();
    if (!text || /^\[.*\]$|^\(.*\)$/.test(text)) continue;
    const start = seg.offsets.from / 1000;
    const end = seg.offsets.to / 1000;
    const prev = words[words.length - 1];
    if (/^[\p{P}\p{S}]+$/u.test(text)) {
      if (prev) {
        prev.text += text;
        prev.end = Math.max(prev.end, end);
      }
      continue;
    }
    words.push({ i: words.length, text, start, end: Math.max(end, start + 0.05) });
  }
  return words;
}
