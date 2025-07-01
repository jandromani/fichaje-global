import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { storageManager } from '../services/storageManager';
import { syncEngine } from '../services/syncEngine';
import type { BaseEntity, LoadingState, FilterState, PaginationState, SyncQueueItem } from '../types';

// ==========================================
// HOOK GENÉRICO PARA GESTIÓN DE DATOS
// ==========================================

interface UseDataOptions<T> {
  key: string;
  defaultValue: T[];
  autoSync?: boolean;
  filterFn?: (item: T, filter: FilterState) => boolean;
  sortFn?: (a: T, b: T) => number;
  pageSize?: number;
}

export function useData<T extends BaseEntity>(options: UseDataOptions<T>) {
  const {
    key,
    defaultValue,
    autoSync = true,
    filterFn,
    sortFn,
    pageSize = 20
  } = options;

  // Estados principales
  const [state, setState] = useState<LoadingState<T[]>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: undefined
  });

  // Estados de filtrado y paginación
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    dateRange: {},
    status: [],
    type: [],
  });

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize,
    total: 0,
    hasNext: false,
    hasPrev: false
  });

  // Referencias para evitar re-renders innecesarios
  const lastSyncRef = useRef<string>('');
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const isLoadingRef = useRef(false);

  // Memoizar las dependencias para evitar re-renders
  const filterKey = useMemo(() => 
    JSON.stringify(filter), [filter]
  );

  const paginationKey = useMemo(() => 
    `${pagination.page}-${pagination.pageSize}`, [pagination.page, pagination.pageSize]
  );

  // ==========================================
  // CARGA INICIAL DE DATOS
  // ==========================================

  const loadData = useCallback(async () => {
    // Evitar cargas múltiples simultáneas
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Limpiar timeout anterior
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      // Simular delay mínimo para mejor UX
      await new Promise(resolve => setTimeout(resolve, 50));

      const rawData = storageManager.get<T[]>(key, defaultValue);
      
      if (!rawData) {
        setState({
          data: defaultValue,
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString()
        });
        return;
      }

      // Aplicar filtros si están definidos
      let filteredData = rawData;
      if (filterFn && (filter.search || filter.status?.length || filter.type?.length || filter.dateRange.start)) {
        filteredData = rawData.filter(item => filterFn(item, filter));
      }

      // Aplicar ordenamiento
      if (sortFn) {
        filteredData = [...filteredData].sort(sortFn);
      }

      // Calcular paginación
      const total = filteredData.length;
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      // Actualizar paginación
      setPagination(prev => ({
        ...prev,
        total,
        hasNext: endIndex < total,
        hasPrev: pagination.page > 1
      }));

      setState({
        data: paginatedData,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error loading data'
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [key, defaultValue, filterFn, sortFn, filterKey, paginationKey]);

  // ==========================================
  // OPERACIONES CRUD
  // ==========================================

  const create = useCallback(async (newItem: Omit<T, keyof BaseEntity>): Promise<T | null> => {
    try {
      const now = new Date().toISOString();
      const fullItem: T = {
        ...newItem,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        version: 1,
        syncStatus: 'pending'
      } as T;

      const currentData = storageManager.get<T[]>(key, defaultValue);
      const updatedData = [...currentData, fullItem];
      
      const success = storageManager.set(key, updatedData);
      if (!success) {
        throw new Error('Failed to save data');
      }

      // Agregar a cola de sincronización
      if (autoSync) {
        syncEngine.addToQueue({
          type: key.replace('wmapp_', '') as SyncQueueItem['type'],
          action: 'create',
          data: fullItem,
          maxAttempts: 3
        });
      }

      // Recargar datos
      await loadData();
      
      return fullItem;
    } catch (error) {
      console.error(`[useData] Create error for ${key}:`, error);
      return null;
    }
  }, [key, defaultValue, autoSync, loadData]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T | null> => {
    try {
      const currentData = storageManager.get<T[]>(key, defaultValue);
      const itemIndex = currentData.findIndex(item => item.id === id);
      
      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      const existingItem = currentData[itemIndex];
      const updatedItem: T = {
        ...existingItem,
        ...updates,
        updatedAt: new Date().toISOString(),
        version: existingItem.version + 1,
        syncStatus: 'pending'
      };

      const updatedData = [...currentData];
      updatedData[itemIndex] = updatedItem;
      
      const success = storageManager.set(key, updatedData);
      if (!success) {
        throw new Error('Failed to save data');
      }

      // Agregar a cola de sincronización
      if (autoSync) {
        syncEngine.addToQueue({
          type: key.replace('wmapp_', '') as SyncQueueItem['type'],
          action: 'update',
          data: updatedItem,
          maxAttempts: 3
        });
      }

      // Recargar datos
      await loadData();
      
      return updatedItem;
    } catch (error) {
      console.error(`[useData] Update error for ${key}:`, error);
      return null;
    }
  }, [key, defaultValue, autoSync, loadData]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const currentData = storageManager.get<T[]>(key, defaultValue);
      const itemToDelete = currentData.find(item => item.id === id);
      
      if (!itemToDelete) {
        throw new Error('Item not found');
      }

      const updatedData = currentData.filter(item => item.id !== id);
      
      const success = storageManager.set(key, updatedData);
      if (!success) {
        throw new Error('Failed to save data');
      }

      // Agregar a cola de sincronización
      if (autoSync) {
        syncEngine.addToQueue({
          type: key.replace('wmapp_', '') as SyncQueueItem['type'],
          action: 'delete',
          data: { id },
          maxAttempts: 3
        });
      }

      // Recargar datos
      await loadData();
      
      return true;
    } catch (error) {
      console.error(`[useData] Delete error for ${key}:`, error);
      return false;
    }
  }, [key, defaultValue, autoSync, loadData]);

  const getById = useCallback((id: string): T | null => {
    const currentData = storageManager.get<T[]>(key, defaultValue);
    return currentData.find(item => item.id === id) || null;
  }, [key, defaultValue]);

  // ==========================================
  // EFECTOS
  // ==========================================

  // Carga inicial - solo una vez
  useEffect(() => {
    loadData();
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []); // Solo ejecutar una vez al montar

  // Recargar cuando cambien filtros o paginación
  useEffect(() => {
    if (state.data !== null) { // Solo si ya se cargaron datos inicialmente
      loadData();
    }
  }, [filterKey, paginationKey]);

  // Escuchar cambios de sincronización
  useEffect(() => {
    if (!autoSync) return;

    const unsubscribe = syncEngine.onStatusChange((status) => {
      const currentSync = status.lastSync || '';
      if (currentSync !== lastSyncRef.current && currentSync) {
        lastSyncRef.current = currentSync;
        loadData();
      }
    });

    return unsubscribe;
  }, [autoSync, loadData]);

  // ==========================================
  // MÉTODOS DE PAGINACIÓN Y FILTRADO
  // ==========================================

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      setPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, setPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      setPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, setPage]);

  const resetFilter = useCallback(() => {
    setFilter({
      search: '',
      dateRange: {},
      status: [],
      type: [],
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // ==========================================  
  // RETORNO DEL HOOK
  // ==========================================

  return {
    // Estados
    ...state,
    filter,
    pagination,
    
    // Métodos CRUD
    create,
    update,
    remove,
    getById,
    
    // Métodos de control
    refresh,
    setFilter,
    resetFilter,
    setPage,
    nextPage,
    prevPage,
    
    // Información útil
    isEmpty: state.data?.length === 0,
    hasData: (state.data?.length || 0) > 0,
    totalItems: pagination.total
  };
}

// ==========================================
// HOOKS ESPECÍFICOS POR ENTIDAD
// ==========================================

export function useUsers() {
  return useData({
    key: 'wmapp_users',
    defaultValue: [],
    filterFn: (user, filter) => {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch = !filter.search || 
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department?.toLowerCase().includes(searchLower);

      const matchesStatus = !filter.status?.length || 
        filter.status.includes(user.isActive ? 'active' : 'inactive');

      const matchesRole = !filter.type?.length || 
        filter.type.includes(user.role);

      return matchesSearch && matchesStatus && matchesRole;
    },
    sortFn: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  });
}

export function useStations() {
  return useData({
    key: 'wmapp_stations',
    defaultValue: [],
    filterFn: (station, filter) => {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch = !filter.search || 
        station.name.toLowerCase().includes(searchLower) ||
        station.location.address.toLowerCase().includes(searchLower);

      const matchesStatus = !filter.status?.length || 
        filter.status.includes(station.isActive ? 'active' : 'inactive');

      const matchesType = !filter.type?.length || 
        filter.type.includes(station.stationType);

      return matchesSearch && matchesStatus && matchesType;
    },
    sortFn: (a, b) => a.name.localeCompare(b.name)
  });
}

export function useClockIns() {
  return useData({
    key: 'wmapp_clockins',
    defaultValue: [],
    filterFn: (clockIn, filter) => {
      const matchesDateRange = (!filter.dateRange.start || clockIn.timestamp >= filter.dateRange.start) &&
        (!filter.dateRange.end || clockIn.timestamp <= filter.dateRange.end);

      const matchesType = !filter.type?.length || 
        filter.type.includes(clockIn.type);

      const matchesUser = !filter.userId || clockIn.userId === filter.userId;
      const matchesStation = !filter.stationId || clockIn.stationId === filter.stationId;

      return matchesDateRange && matchesType && matchesUser && matchesStation;
    },
    sortFn: (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  });
}

export function useLeaveRequests() {
  return useData({
    key: 'wmapp_leave_requests',
    defaultValue: [],
    filterFn: (leave, filter) => {
      const matchesDateRange = (!filter.dateRange.start || leave.startDate >= filter.dateRange.start) &&
        (!filter.dateRange.end || leave.endDate <= filter.dateRange.end);

      const matchesStatus = !filter.status?.length || 
        filter.status.includes(leave.status);

      const matchesType = !filter.type?.length || 
        filter.type.includes(leave.type);

      const matchesUser = !filter.userId || leave.userId === filter.userId;

      return matchesDateRange && matchesStatus && matchesType && matchesUser;
    },
    sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  });
}

// ==========================================
// UTILIDADES
// ==========================================

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}