import { useState, useCallback } from "react";
import { getMode, setMode } from "@/api/config";

// Mode changes reload the page so no cached mock data can leak into live mode (or vice versa).
export default function useApiMode() {
  const [mode] = useState(getMode());
  const switchMode = useCallback((/** @type {string} */ next) => {
    setMode(next);
    window.location.reload();
  }, []);
  return { mode, switchMode };
}