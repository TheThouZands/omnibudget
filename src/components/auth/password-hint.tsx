"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/react-dom";
import styles from "./password-fields.module.scss";

type Props = { id: string; anchor: HTMLInputElement; children: ReactNode };

export function PasswordHint({ id, anchor, children }: Props) {
  const popup = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = popup.current;
    if (!element) return;
    // The native top layer also escapes the login modal's scrolling surface.
    element.showPopover();
    let disposed = false;
    const viewport = window.visualViewport;
    const narrow = () => (viewport?.width ?? window.innerWidth) < 960;

    const update = async () => {
      const { x, y } = await computePosition(anchor, element, {
        strategy: "fixed",
        placement: narrow() ? "top" : "left",
        middleware: [
          offset(12),
          ...(!narrow()
            ? [flip({ fallbackPlacements: ["top"], padding: 8 })]
            : []),
          shift({ padding: 8 }),
        ],
      });
      if (!disposed)
        Object.assign(element.style, {
          left: `${x}px`,
          top: `${y}px`,
          visibility: "visible",
        });
    };

    const keepAboveKeyboard = () => {
      if (!narrow()) {
        element.style.maxHeight = "";
        return;
      }
      const top = (viewport?.offsetTop ?? 0) + 12;
      const bottom =
        (viewport?.offsetTop ?? 0) +
        (viewport?.height ?? window.innerHeight) -
        12;
      const rect = anchor.getBoundingClientRect();
      element.style.maxHeight = `${Math.max(48, bottom - top - rect.height - 28)}px`;
      const hintHeight = element.getBoundingClientRect().height;
      // Reserve enough visible space above the focused input for the checklist.
      const desiredTop = Math.max(
        top + hintHeight + 12,
        bottom - rect.height - 16,
      );
      const delta = rect.top - desiredTop;
      if (Math.abs(delta) < 2) return;
      let parent = anchor.parentElement;
      while (
        parent &&
        !(
          parent.scrollHeight > parent.clientHeight &&
          /auto|scroll/.test(getComputedStyle(parent).overflowY)
        )
      )
        parent = parent.parentElement;
      (parent ?? window).scrollBy({ top: delta, behavior: "instant" });
    };

    keepAboveKeyboard();
    const cleanup = autoUpdate(anchor, element, update);
    const handleResize = () => {
      keepAboveKeyboard();
      void update();
    };
    viewport?.addEventListener("resize", handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      disposed = true;
      cleanup();
      viewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleResize);
      element.hidePopover();
    };
  }, [anchor]);

  return (
    <div
      ref={popup}
      id={id}
      role="tooltip"
      popover="manual"
      className={styles.hint}
    >
      {children}
    </div>
  );
}
