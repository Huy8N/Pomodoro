import { useRef, useEffect } from "react";

export function useAudioAlert(src) {
  const audioRef = useRef(null);
  useEffect(() => {
    audioRef.current = new Audio(src);
  }, [src]);
  return audioRef;
}
