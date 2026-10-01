import { flushSync } from "react-dom";
import type { Theme } from "@/lib/theme";
import { applyThemeClass } from "@/lib/theme";

/** Dodo checkout wipes bottom → top (`inset(100% 0 0 0)`). We use the inverse. */
const WIPE_FROM = "inset(0 0 100% 0)";
const WIPE_TO = "inset(0 0 0 0)";
const WIPE_MS = 600;
const WIPE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export type ThemeTransitionOrigin = {
  x: number;
  y: number;
};

type DocumentViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};

function commitTheme(next: Theme, onThemeApplied: (next: Theme) => void) {
  applyThemeClass(next);
  onThemeApplied(next);
}

function animateTopToBottomReveal(transition: DocumentViewTransition) {
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [WIPE_FROM, WIPE_TO] },
        {
          duration: WIPE_MS,
          easing: WIPE_EASING,
          fill: "both",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      transition.skipTransition();
    });
}

export function runThemeTransition(
  next: Theme,
  onThemeApplied: (next: Theme) => void,
  onComplete: () => void,
  _origin?: ThemeTransitionOrigin,
): void {
  if (typeof document === "undefined") {
    onComplete();
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commitTheme(next, onThemeApplied);
    onComplete();
    return;
  }

  const startViewTransition = (
    document as Document & {
      startViewTransition?: (callback: () => void) => DocumentViewTransition;
    }
  ).startViewTransition;

  document.getElementById("theme-wipe-overlay")?.remove();

  if (!startViewTransition) {
    commitTheme(next, onThemeApplied);
    onComplete();
    return;
  }

  try {
    const transition = startViewTransition(() => {
      flushSync(() => {
        commitTheme(next, onThemeApplied);
      });
    });

    animateTopToBottomReveal(transition);

    transition.finished.finally(onComplete).catch(() => {
      transition.skipTransition();
      onComplete();
    });
  } catch {
    commitTheme(next, onThemeApplied);
    onComplete();
  }
}
