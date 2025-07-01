export interface Repository<T> {
  list(): T[];
  getById(id: string): T | null;
  add(item: T): T;
  update(id: string, changes: Partial<T>): T | null;
  remove(id: string): boolean;
}

export function createRepository<T extends { id: string; createdAt: string; companyId: string }>(
  entityName: string,
  storageKey: string
): Repository<T> {
  const load = (): T[] => {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? (JSON.parse(data) as T[]) : [];
    } catch {
      return [];
    }
  };

  const save = (items: T[]) => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  };

  const validate = (item: T) => {
    if (!item.id || !item.createdAt || !item.companyId) {
      throw new Error(`${entityName} missing required fields`);
    }
  };

  return {
    list() {
      return load();
    },
    getById(id: string) {
      return load().find((it) => it.id === id) || null;
    },
    add(item: T) {
      validate(item);
      const items = load();
      if (items.find((it) => it.id === item.id)) {
        throw new Error(`${entityName} with id ${item.id} already exists`);
      }
      items.push(item);
      save(items);
      return item;
    },
    update(id: string, changes: Partial<T>) {
      const items = load();
      const index = items.findIndex((it) => it.id === id);
      if (index === -1) return null;
      const updated = { ...items[index], ...changes };
      validate(updated as T);
      items[index] = updated as T;
      save(items);
      return items[index];
    },
    remove(id: string) {
      const items = load();
      const index = items.findIndex((it) => it.id === id);
      if (index === -1) return false;
      items.splice(index, 1);
      save(items);
      return true;
    },
  };
}
