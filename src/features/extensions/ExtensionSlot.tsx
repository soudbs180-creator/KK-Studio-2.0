import React, { useEffect, useRef } from "react";
import type { SlotDefinition, SlotMountContext } from "./extensionTypes.ts";
import { useExtensionSlot } from "./useExtensionSlot.ts";
import { ExtensionSlotErrorBoundary } from "./ExtensionSlotErrorBoundary.tsx";

export interface ExtensionSlotProps {
  id: string;
  payload?: Record<string, unknown>;
  className?: string;
}

function SlotItemMount({
  definition,
  slotId,
  payload,
}: {
  definition: SlotDefinition;
  slotId: string;
  payload?: Record<string, unknown>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = "";
    const ctx: SlotMountContext = {
      container: el,
      slotId,
      extensionId: definition.id ?? "anonymous",
      payload,
    };

    let cleanup: (() => void) | void;
    try {
      cleanup = definition.render(ctx);
    } catch (err) {
      console.error(
        `[ExtensionSlot] Render failed for ${definition.id ?? "anonymous"}:`,
        err,
      );
    }

    return () => {
      try {
        if (typeof cleanup === "function") cleanup();
      } catch (err) {
        console.error(`[ExtensionSlot] Cleanup failed:`, err);
      }
      el.innerHTML = "";
    };
  }, [definition, slotId, payload]);

  return <div ref={containerRef} className="kk-extension-slot-item" />;
}

export function ExtensionSlot({ id, payload, className }: ExtensionSlotProps) {
  const items = useExtensionSlot(id);

  if (!items.length) return null;

  return (
    <div
      className={`kk-extension-slot kk-extension-slot-${id.replace(/\./g, "-")} ${className ?? ""}`}
    >
      {items.map((item) => (
        <ExtensionSlotErrorBoundary
          key={item.id ?? `${id}-${item.order ?? 0}`}
          slotId={id}
          itemId={item.id}
        >
          <SlotItemMount definition={item} slotId={id} payload={payload} />
        </ExtensionSlotErrorBoundary>
      ))}
    </div>
  );
}
