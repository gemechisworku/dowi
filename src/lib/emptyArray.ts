/**
 * A single stable empty-array reference to pass as useLiveQuery's default
 * result. Using `result ?? []` instead would create a new array every
 * render, defeating referential-equality checks (e.g. as a useMemo/useEffect
 * dependency) even when the query genuinely hasn't changed.
 */
export const EMPTY_ARRAY: readonly never[] = []
