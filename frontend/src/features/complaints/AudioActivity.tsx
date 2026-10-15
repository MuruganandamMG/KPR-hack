import { useLanguage } from "../localization";
import { useEffect, useState } from "react";

export function AudioActivity({ stream }: { stream: MediaStream | null }) {
  const { t } = useLanguage();

  const [level, setLevel] = useState(0);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!stream || !window.AudioContext) return;
    let context: AudioContext | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      context = new AudioContext();
      const analyzer = context.createAnalyser();
      analyzer.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyzer);
      const samples = new Uint8Array(analyzer.fftSize);
      void context.resume().catch(() => {});
      setAvailable(true);
      timer = setInterval(() => {
        analyzer.getByteTimeDomainData(samples);
        const peak = samples.reduce(
          (highest, value) => Math.max(highest, Math.abs(value - 128)),
          0,
        );
        setLevel(Math.min(1, (peak / 128) * 4));
      }, 100);
    } catch {
      setAvailable(false); // Recording can continue without optional audio metering.
    }
    return () => {
      if (timer) clearInterval(timer);
      if (context) void context.close().catch(() => {});
    };
  }, [stream]);
  return available ? (
    <div className="w-full max-w-xs">
      <label
        className="field-label text-center text-xs"
        htmlFor="microphone-level"
      >
        {t("Microphone activity")}
      </label>
      <meter
        id="microphone-level"
        min={0}
        max={1}
        value={level}
        className="h-3 w-full"
      />
    </div>
  ) : null;
}
