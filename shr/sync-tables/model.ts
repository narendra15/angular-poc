

// Raw API item coming from backend (like your sample JSON)
export type ArchiveItem = {
    year: number;               // e.g. 2025
    month: string;              // "01".."12" (string from API)
    isIncluded: 'Y' | 'N';      // 'Y' (included/green) | 'N' (removed/red)
    ts: string;                 // ISO timestamp string
  };
  
  // UI model for each month card (used in left panel grid)
  export type UiMonth = {
    year: number;
    month: number;              // 1..12 (normalized from string)
    checked: boolean;           // true if included (Y)
    initialChecked: boolean;    // baseline from API
    changed: boolean;           // checked != initialChecked
    ts: string;                 // ISO timestamp to display
  };
  
  // Delta model (used in Apply Changes payload)
  export type ChangeDelta = {
    year: number;
    month: number;              // 1..12
    from: 'Y' | 'N';
    to: 'Y' | 'N';
  };
  