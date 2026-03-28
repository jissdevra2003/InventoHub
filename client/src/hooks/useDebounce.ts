import { useEffect, useState } from "react";

// ─── useDebounce Hook ───
// WHY? When a user types in a search box, you don't want to fire an API call
// on every single keystroke. This hook waits until the user STOPS typing for
// `delay` milliseconds, then returns the final value.
//
// USAGE:
//   const [search, setSearch] = useState("");
//   const debouncedSearch = useDebounce(search, 300);
//   useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cleanup if value changes before delay
  }, [value, delay]);

  return debounced;
}
