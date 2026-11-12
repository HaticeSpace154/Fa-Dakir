import { create } from 'zustand';
import { getLastReadingPosition, getStoredFontSize, setStoredFontSize } from '../services/storageService';
import { recitationSupportsMushafPages } from '../data/recitations';

// Page mode only makes sense for riwayas with published Mushaf artwork; stored 'page' positions fall back to text otherwise.
const getInitialViewMode = () => {
  const position = getLastReadingPosition();
  return position.viewMode === 'page' && recitationSupportsMushafPages(position.recitation) ? 'page' : 'surah';
};

export const useReaderStore = create((set) => ({
  viewMode: getInitialViewMode(),
  fontSize: getStoredFontSize(),
  isZenMode: false,
  // True when the controls were hidden on purpose with the eye button; double-click must not bring them back.
  isNavPinnedHidden: false,
  // Seconds left in a timed auto-scroll run (null when no timed run is active).
  scrollTimerRemainingSec: null,
  setViewMode: (next) => set((state) => {
    const value = typeof next === 'function' ? next(state.viewMode) : next;
    return { viewMode: value === 'page' || value === 'surah' ? value : 'surah' };
  }),
  toggleViewMode: () => set((state) => ({ viewMode: state.viewMode === 'surah' ? 'page' : 'surah' })),
  setZenMode: (isZenMode) => set({ isZenMode }),
  setScrollTimerRemainingSec: (scrollTimerRemainingSec) => set({ scrollTimerRemainingSec }),
  // The eye button: hiding pins the controls hidden, showing releases the pin.
  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode, isNavPinnedHidden: !state.isZenMode })),
  zoomIn: () => set((state) => ({ fontSize: setStoredFontSize(state.fontSize + 2) })),
  zoomOut: () => set((state) => ({ fontSize: setStoredFontSize(state.fontSize - 2) })),
}));
