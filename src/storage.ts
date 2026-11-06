// Même clé et même format que V4 : aucune migration destructive.
export const KEY = 'ironlog-v4-prototype-2026-11-06';
export type StorageWriter = Pick<Storage, 'setItem'>;
export function persist(storage: StorageWriter, state: unknown): void {
  storage.setItem(KEY, JSON.stringify(state));
}
