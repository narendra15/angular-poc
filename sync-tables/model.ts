

// Raw API item coming from backend (like your sample JSON)
export type ArchiveItem = { 
    Year: number;             // e.g. 2025
    Month: number;            // 1..12
    isArchived: 'Y' | 'N';    // backend sends 'Y' (archived) or 'N' (not archived)
  };
  
  // UI model for each month card (used in left panel grid)
  export type UiMonth = {
    year: number;             // Year of the month
    month: number;            // Month number
    checked: boolean;         // Current checkbox state in UI
    initialChecked: boolean;  // Baseline (original value from API)
    changed: boolean;         // True if user toggled compared to baseline
  };
  
  // Delta model (used in Apply Changes payload)
  export type ChangeDelta = {
    year: number;             // Year of the change
    month: number;            // Month of the change
    from: 'Y' | 'N';          // Baseline/original value
    to: 'Y' | 'N';            // New value after user toggle
  };
  