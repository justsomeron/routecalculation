"use client";

import { useEffect, useRef, useState } from "react";

export type AddressValue = {
  address: string;
  lat: number;
  lng: number;
};

type Suggestion = {
  displayName: string;
  lat: number;
  lng: number;
};

export function AddressAutocomplete({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: AddressValue | null;
  onChange: (value: AddressValue | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.address ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value?.address ?? "");
  }, [value?.address]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onInputChange(next: string) {
    setQuery(next);
    onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(next)}`);
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function select(s: Suggestion) {
    setQuery(s.displayName);
    onChange({ address: s.displayName, lat: s.lat, lng: s.lng });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-xs font-medium text-slate-600">
          {label}
        </label>
      )}
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      {loading && (
        <span className="absolute right-2 top-8 text-xs text-slate-400">…</span>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => select(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {s.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
