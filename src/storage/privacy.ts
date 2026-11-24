import { db as defaultDb, type MotivatorDB } from './db';

export const EXPORT_FORMAT = 'motivator-export';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/** Everything the app stores about the user, as one JSON-serialisable object. */
export async function exportAll(
  db: MotivatorDB = defaultDb,
  now = new Date(),
): Promise<ExportFile> {
  const tables: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    tables[table.name] = await table.toArray();
  }
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), tables };
}

/** Starts a local download of the export. Nothing is uploaded. */
export async function downloadExport(db: MotivatorDB = defaultDb): Promise<void> {
  const data = await exportAll(db);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `motivator-export-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface DeleteOptions {
  /** Also remove downloaded models (Cache Storage and OPFS). Default true. */
  includeModels?: boolean;
}

/**
 * Deletes the database and, by default, every cached model file.
 * The app should reload afterwards.
 */
export async function deleteEverything(
  db: MotivatorDB = defaultDb,
  { includeModels = true }: DeleteOptions = {},
): Promise<void> {
  db.close();
  await db.delete();

  if (!includeModels) return;

  if (typeof caches !== 'undefined') {
    const keys = await caches.keys();
    // Keep the service worker's copy of the app itself, so the app still opens offline.
    const modelCaches = keys.filter((key) => !key.startsWith('workbox-'));
    await Promise.all(modelCaches.map((key) => caches.delete(key)));
  }

  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (storage?.getDirectory) {
    try {
      const root = await storage.getDirectory();
      // `keys()` is not in every TS lib version yet.
      const dir = root as FileSystemDirectoryHandle & { keys(): AsyncIterable<string> };
      for await (const name of dir.keys()) {
        await root.removeEntry(name, { recursive: true });
      }
    } catch {
      // OPFS unavailable (private mode, old browser): nothing stored there.
    }
  }
}
