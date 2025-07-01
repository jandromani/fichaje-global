import { useEffect, useState } from 'react';
import type { Worker, ClockRecord, Position, AbsenceRequest, QRTemplate } from '../types';
import { STORAGE_KEYS } from '../types';
import { createRepository } from '../repositories/createRepository';

const workerRepo = createRepository<Worker>('Worker', STORAGE_KEYS.WORKERS);
const clockRepo = createRepository<ClockRecord>('ClockRecord', STORAGE_KEYS.CLOCK_RECORDS);
const positionRepo = createRepository<Position>('Position', STORAGE_KEYS.POSITIONS);
const absenceRepo = createRepository<AbsenceRequest>('AbsenceRequest', STORAGE_KEYS.ABSENCE_REQUESTS);
const templateRepo = createRepository<QRTemplate>('QRTemplate', STORAGE_KEYS.QR_TEMPLATES);

function createHook<T>(repo: ReturnType<typeof createRepository>) {
  return function useRepo() {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = () => {
      try {
        setItems(repo.list() as T[]);
        setLoading(false);
      } catch (e) {
        setError((e as Error).message);
      }
    };

    useEffect(() => {
      refetch();
    }, []);

    const add = (item: T) => {
      try {
        repo.add(item as any);
        refetch();
      } catch (e) {
        setError((e as Error).message);
      }
    };

    const remove = (id: string) => {
      try {
        repo.remove(id);
        refetch();
      } catch (e) {
        setError((e as Error).message);
      }
    };

    const update = (id: string, changes: Partial<T>) => {
      try {
        repo.update(id, changes as any);
        refetch();
      } catch (e) {
        setError((e as Error).message);
      }
    };

    return { items, loading, error, add, remove, update, refetch } as const;
  };
}

export const useWorkers = createHook<Worker>(workerRepo);
export const useClockRecords = createHook<ClockRecord>(clockRepo);
export const usePositions = createHook<Position>(positionRepo);
export const useAbsenceRequests = createHook<AbsenceRequest>(absenceRepo);
export const useQRTemplates = createHook<QRTemplate>(templateRepo);

