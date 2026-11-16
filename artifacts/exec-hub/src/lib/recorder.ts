// Grabación de reuniones por segmentos. Cada segmento es un archivo de audio
// completo (el API de transcripción acepta máx. ~25 MB), así una junta de 2 h
// se transcribe por partes sin perder nada.
export const SEGMENT_MS = 10 * 60 * 1000;

export function pickMime(): string {
  const options = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  return options.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}

export interface RecorderHandle {
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stream: MediaStream;
}

export async function startRecording(onSegment: (blob: Blob) => void | Promise<void>): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const mime = pickMime();
  let current: MediaRecorder | null = null;
  let timer: number | undefined;
  let stopped = false;
  let paused = false;
  const pending: Promise<void>[] = [];

  const startSegment = () => {
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<void>((resolve) => {
      rec.onstop = async () => {
        if (chunks.length) await onSegment(new Blob(chunks, { type: rec.mimeType || mime || 'audio/mp4' }));
        resolve();
      };
    });
    pending.push(done);
    rec.start(1000);
    current = rec;
    timer = window.setTimeout(rotate, SEGMENT_MS);
  };

  const rotate = () => {
    if (stopped) return;
    const old = current;
    startSegment();
    if (old && old.state !== 'inactive') old.stop();
  };

  startSegment();

  // Evita que el iPad bloquee la pantalla durante la junta.
  let wakeLock: { release: () => Promise<void> } | null = null;
  try {
    wakeLock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } })
      .wakeLock?.request('screen') ?? null;
  } catch { /* no soportado */ }

  return {
    stream,
    pause: () => { if (current?.state === 'recording') { current.pause(); paused = true; } },
    resume: () => { if (paused && current?.state === 'paused') { current.resume(); paused = false; } },
    stop: async () => {
      stopped = true;
      window.clearTimeout(timer);
      if (current && current.state !== 'inactive') current.stop();
      await Promise.all(pending);
      stream.getTracks().forEach((t) => t.stop());
      try { await wakeLock?.release(); } catch { /* nada */ }
    },
  };
}
