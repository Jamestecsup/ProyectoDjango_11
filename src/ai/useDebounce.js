import { useEffect, useState } from "react";

// Fixed: the timer is created and cancelled by the SAME effect. The old version had no
// cleanup there, so every keystroke left a live timer and the intermediate values reached
// the screen. The extra mount-only effect is gone: it only cancelled the last timer.
export default function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
