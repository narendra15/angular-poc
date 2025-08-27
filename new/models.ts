/**
 * src/app/system-health/models.ts
 *
 * PURPOSE
 * -------
 * Central place for all strongly-typed models the System Health UI uses.
 * These names match the NEW backend/dummy JSON you described so that:
 *   - status color comes from `sh_load_status`
 *   - tooltip header/text/colors come from `sh_load_message_*`
 *   - counts and dates use the new field names (e.g., sh_target_record_cnt)
 *
 * Tip for new devs:
 *   If you add a new server field, extend ShRaw here first, then use it inside ingest.ts.
 */

/* ------------------------------------
 * Small primitive aliases
 * ---------------------------------- */

/** ISO date formatted as "YYYY-MM-DD" (e.g., "2025-06-02"). */
export type IsoDate = `${number}-${number}-${number}`;

/**
 * Load status from the server.
 * We treat this like the S/W/E traffic-light:
 *   - 'S' = success (green)
 *   - 'W' = warning (amber)
 *   - 'E' = error (red)
 * If missing/empty, we consider it "blank" (no dot).
 */
export type ShLoadStatus = 'S' | 'W' | 'E' | '' | undefined;

/**
 * Which widget the record belongs to:
 *   - 'A' = AXIOM (File Generation timeline)
 *   - 'S' = Source Systems (Daily/Monthly timeline)
 *   - 'M' / 'L' = Mapping / Lookup (Monthly status table)
 */
export type ShFeedCategory = 'A' | 'S' | 'M' | 'L';

/* ------------------------------------
 * Raw record from backend / dummy JSON
 * ---------------------------------- */

/**
 * This interface mirrors the NEW response format you documented.
 * Only add optional (?:) when the field may be missing in some rows.
 */
export interface ShRaw {
  /** Reporting date that this record refers to (column on the timeline). */
  sh_report_date: IsoDate;

  /** When the file was actually received/generated/merged, if applicable. */
  sh_feed_load_date?: IsoDate;

  /** Widget category: 'A' (AXIOM), 'S' (Source), 'M'/'L' (Mapping/Lookup). */
  sh_feed_ctgry: ShFeedCategory;

  /**
   * Human-friendly label shown in the first column (row name).
   * Examples: "QRM", "APMS Monthly", "QRM Monthly"
   */
  sh_feed_type: string;

  /** Active flag – we ignore records with inactive flag. */
  sh_active_rec_ind: 'A' | 'I';

  /**
   * NEW: status that drives the dot color (S/W/E).
   * We ignore the older sh_status for the dot.
   */
  sh_load_status?: ShLoadStatus;

  /** NEW: tooltip header line, e.g., "Loaded Successfully", "Submitted with Warnings". */
  sh_load_message_header?: string;

  /** NEW: tooltip body/details (free text). */
  sh_load_message_details?: string;

  /**
   * NEW: tooltip header color code:
   *   'G' => green, 'A' => amber, 'R' => red, empty => default text color
   */
  sh_load_message_color?: 'G' | 'A' | 'R' | '' | undefined;

  /** Source count for the day/month (used in tooltips). */
  sh_source_record_cnt?: number;

  /** Target/loaded count for the day/month (used in tooltips). */
  sh_target_record_cnt?: number;
}

/* ------------------------------------
 * Grid/table view models
 * ---------------------------------- */

/**
 * Visual "kind" plotted in a cell:
 *   - Success/Warning/Error: filled green/amber/red dot
 *   - NotReceived: red ring (Source past weekday with no file)
 *   - NotGenerated: red ring/dot (AXIOM past date with no generation)
 *   - Blank: no indicator shown
 */
export type CellKind =
  | 'Success'
  | 'Warning'
  | 'Error'
  | 'NotReceived'
  | 'NotGenerated'
  | 'Blank';

/** Minimal tooltip payload the UI knows how to render. */
export interface CellTooltip {
  /** First line of the tooltip, e.g., "Loaded Successfully". */
  title: string;

  /** Optional color for the title: 'G' => green, 'A' => amber, 'R' => red. */
  color?: 'G' | 'A' | 'R';

  /** Each string renders on its own line. Keep them short & human friendly. */
  lines: string[];

  /**
   * Optional action button/link inside the tooltip.
   * Used for Mapping "Success" where you want "Validation Checks".
   * The UI will call goTo(action.cmd) when clicked.
   */
  action?: {
    label: string;   // e.g., "Validation Checks"
    cmd: 'validation-checks' | string;
  };
}

/**
 * One cell of the timeline grid.
 * For monthly rows, we use a single cell with colSpan = number of days.
 */
export interface Cell {
  date: IsoDate;       // the day this cell corresponds to (first day for monthly)
  kind: CellKind;      // drives the dot/ring in the table cell
  colSpan?: number;    // only set for monthly rows (merged cell)
  tooltip?: CellTooltip; // optional details popover for this cell
}

/** A row in the timeline table: a label and a sequence of day cells. */
export interface Row {
  label: string;
  cells: Cell[];
}

/** Column in the Mapping/Lookup (monthly) table. */
export interface MappingColumn {
  label: string;        // column header text
  status: CellKind;     // dot ring color for that mapping file
  tooltip?: CellTooltip; // open on click
}
