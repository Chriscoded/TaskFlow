
import { useEffect, useState } from "react";

interface DebouncedSearchProps {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  delay?: number;
}

export default function DebouncedSearch({
  value,
  onSearch,
  placeholder = "Search tasks...",
  delay = 600,
}: DebouncedSearchProps) {
  const [inputValue, setInputValue] = useState(value);

  // Synchronize the input when the parent clears or resets the search.
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Notify the parent only after typing has stopped.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmedValue = inputValue.trim();

      if (trimmedValue !== value) {
        onSearch(trimmedValue);
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [inputValue, value, delay, onSearch]);

  return (
    <label className="search-box">
      <span aria-hidden="true">⌕</span>

      <input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Search tasks"
      />
    </label>
  );
}
