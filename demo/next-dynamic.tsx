import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

/** Minimal stand-in for next/dynamic in the static demo bundle. */
export default function dynamic<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
  options: { loading?: () => ReactNode } = {},
) {
  const Lazy = lazy(load);
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={options.loading?.() ?? null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
