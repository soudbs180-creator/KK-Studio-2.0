import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import {
  compareImage,
  reconcileCompareSelection,
  toggleCompareSelection,
  type CompareImage,
} from "./imageCompare";

interface ImageCompareState {
  images: CompareImage[];
  isOpen: boolean;
  toggle: (id: string) => void;
  clear: () => void;
  remove: (id: string) => void;
  open: () => void;
  close: () => void;
}

const ImageCompareContext = createContext<ImageCompareState | null>(null);

export function useImageCompare(): ImageCompareState | null {
  return useContext(ImageCompareContext);
}

export default function ImageCompareProvider({
  items,
  active,
  children,
}: {
  items: CanvasCollectionItem[];
  active: boolean;
  children: ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const validIds = reconcileCompareSelection(selectedIds, items);
  const images = useMemo(
    () =>
      validIds.flatMap((id) => {
        const item = items.find((entry) => entry.id === id);
        const image = item && compareImage(item);
        return image ? [image] : [];
      }),
    [items, selectedIds],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const next = reconcileCompareSelection(current, items);
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [items]);
  useEffect(() => {
    if (!active || images.length < 2) setIsOpen(false);
  }, [active, images.length]);

  const state: ImageCompareState = {
    images,
    isOpen,
    toggle: (id) =>
      setSelectedIds((current) => toggleCompareSelection(current, id, items)),
    clear: () => {
      setSelectedIds([]);
      setIsOpen(false);
    },
    remove: (id) =>
      setSelectedIds((current) => current.filter((entry) => entry !== id)),
    open: () => {
      if (images.length >= 2) setIsOpen(true);
    },
    close: () => setIsOpen(false),
  };
  return (
    <ImageCompareContext.Provider value={state}>
      {children}
    </ImageCompareContext.Provider>
  );
}
