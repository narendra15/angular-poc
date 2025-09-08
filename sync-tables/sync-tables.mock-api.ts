import { ArchiveItem } from './model';

// Simulates API call: fetch archive matrix from backend
export async function fetchArchiveMatrix(): Promise<ArchiveItem[]> {
  // Seed data (some years partially filled for demo)
  const seed: ArchiveItem[] = [
    { Year: 2025, Month: 4, isArchived: 'N' },
    { Year: 2024, Month: 1, isArchived: 'Y' },
    { Year: 2023, Month: 7, isArchived: 'Y' },
  ];

  // Fill all 12 months (missing months default = 'N')
  const years = Array.from(new Set(seed.map(s => s.Year)));
  const filled: ArchiveItem[] = [];
  for (const y of years) {
    const byMonth = new Map(seed.filter(s => s.Year === y).map(s => [s.Month, s.isArchived]));
    for (let m = 1; m <= 12; m++) {
      filled.push({ Year: y, Month: m, isArchived: byMonth.get(m) ?? 'N' });
    }
  }

  // Simulate network delay
  await new Promise(r => setTimeout(r, 200));
  return filled;
}

// Simulates API call: apply deltas (POST)
export async function applyArchiveChanges(deltas: { Year: number; Month: number; to: 'Y'|'N' }[]): Promise<{ ok: true }> {
  await new Promise(r => setTimeout(r, 200));
  console.log('Mock applied changes:', deltas);
  return { ok: true };
}