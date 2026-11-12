import { useEffect, useState } from "react";

// Returns the last value that has stayed unchanged for `delay` ms.
// The timer lives inside the effect and its cleanup cancels it: no timer survives a new
// change or an unmount.
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
