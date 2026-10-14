import { useEffect, useRef, useState } from "react";

export function useRecorder(onAudio: (file: File) => void) {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const starting = useRef(false);
  const generation = useRef(0);
  const onAudioRef = useRef(onAudio);
  onAudioRef.current = onAudio;
  const cleanup = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      if (recorder.current?.state === "recording") recorder.current.stop();
      cleanup();
    };
  }, []);
  async function start() {
    if (starting.current || recorder.current?.state === "recording") return;
    starting.current = true;
    const token = ++generation.current;
    setPending(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Recording is unavailable in this browser. Upload an audio file or type your complaint.",
        );
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || generation.current !== token) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const instance = new MediaRecorder(
        media,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = instance;
      const chunks: Blob[] = [];
      instance.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      instance.onstop = () => {
        cleanup();
        if (!mounted.current) return;
        setRecording(false);
        const type = instance.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (blob.size)
          onAudioRef.current(
            new File(
              [blob],
              `complaint.${type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"}`,
              { type },
            ),
          );
      };
      instance.onerror = () => {
        cleanup();
        if (mounted.current) {
          setRecording(false);
          setError("Recording failed. Please try again or upload audio.");
        }
      };
      instance.start(1000);
      setRecording(true);
      setSeconds(0);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed += 1;
        setSeconds(elapsed);
        if (elapsed >= 120 && instance.state === "recording") instance.stop();
      }, 1000);
    } catch (e) {
      if (!mounted.current || generation.current !== token) return;
      cleanup();
      if (mounted.current && generation.current === token)
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Microphone permission was denied. Allow access or upload an audio file."
            : e instanceof Error
              ? e.message
              : "Could not start recording.",
        );
    } finally {
      if (generation.current === token) {
        starting.current = false;
        if (mounted.current) setPending(false);
      }
    }
  }
  function stop() {
    if (starting.current) {
      generation.current += 1;
      starting.current = false;
      setPending(false);
    }
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  return { recording, pending, seconds, error, start, stop };
}
