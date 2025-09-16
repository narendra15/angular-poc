// import { ArchiveItem } from './model';

// // Simulates API call: fetch archive matrix from backend
// export async function fetchArchiveMatrix(): Promise<ArchiveItem[]> {
//   // Seed data (some years partially filled for demo)
//   const data = [
//     { year: 2025, month: '01', isIncluded: 'Y', ts: '2025-02-01T10:20:20' },
//     { year: 2025, month: '02', isIncluded: 'Y', ts: '2025-02-01T10:22:20' },
//     { year: 2024, month: '12', isIncluded: 'N', ts: '2024-12-31T09:10:00' },
//     { year: 2024, month: '11', isIncluded: 'N', ts: '2024-11-30T08:00:00' }
//   ];
//   // Fill all 12 months (missing months default = 'N')
//   const years = Array.from(new Set(seed.map(s => s.Year)));
//   const filled: ArchiveItem[] = [];
//   for (const y of years) {
//     const byMonth = new Map(seed.filter(s => s.Year === y).map(s => [s.Month, s.isArchived]));
//     for (let m = 1; m <= 12; m++) {
//       filled.push({ Year: y, Month: m, isArchived: byMonth.get(m) ?? 'N' });
//     }
//   }

//   // Simulate network delay
//   await new Promise(r => setTimeout(r, 200));
//   return filled;
// }

// // Simulates API call: apply deltas (POST)
// export async function applyArchiveChanges(deltas: { Year: number; Month: number; to: 'Y'|'N' }[]): Promise<{ ok: true }> {
//   await new Promise(r => setTimeout(r, 200));
//   console.log('Mock applied changes:', deltas);
//   return { ok: true };
// }