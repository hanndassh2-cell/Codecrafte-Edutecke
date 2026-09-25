import { useState, useCallback, useRef } from "react";

/**
 * Custom hook for unified, safe UI state per active visit.
 * Ensures each window/view starts with its standard default UI state.
 */
export function useUiState<T extends Record<string, any>>(
  _pageKey: string,
  defaultState: T
): [T, (updates: Partial<T> | ((prev: T) => T)) => void, () => void] {
  const [uiState, setUiStateInternal] = useState<T>(defaultState);

  const setUiState = useCallback(
    (updates: Partial<T> | ((prev: T) => T)) => {
      setUiStateInternal((prev) => {
        return typeof updates === "function" ? updates(prev) : { ...prev, ...updates };
      });
    },
    []
  );

  const saveUiState = useCallback(() => {
    // In-memory per active visit
  }, []);

  return [uiState, setUiState, saveUiState];
}
