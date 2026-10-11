'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseBottomSheetReturn {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  sheetRef: React.RefObject<HTMLDivElement>;
  dragOffset: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isDragging: boolean;
}

export function useBottomSheet(initialOpen = false): UseBottomSheetReturn {
  const [open, setOpen] = useState(initialOpen);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startOffset = useRef(0);

  const openSheet = useCallback(() => {
    setOpen(true);
    setDragOffset(0);
  }, []);

  const closeSheet = useCallback(() => {
    setOpen(false);
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!open) return;
    startY.current = e.touches[0].clientY;
    startOffset.current = dragOffset;
    setIsDragging(true);
  }, [open, dragOffset]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!open || !isDragging) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setDragOffset(startOffset.current + delta);
    }
  }, [open, isDragging]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset > 100) {
      closeSheet();
    } else {
      setDragOffset(0);
    }
  }, [isDragging, dragOffset, closeSheet]);

  // Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        closeSheet();
      }
    };
    if (open) {
      document.addEventListener('keydown', onKeyDown);
    }
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeSheet]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return {
    open,
    openSheet,
    closeSheet,
    sheetRef,
    dragOffset,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isDragging,
  };
}