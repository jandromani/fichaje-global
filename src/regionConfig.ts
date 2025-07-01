export interface RegionRules {
  timezone: string;
  maxHoursPerDay: number;
  minRestHours: number;
  manualAllowed: boolean;
  holidays: string[];
}

export const regionConfig: Record<string, RegionRules> = {
  ES: {
    timezone: 'Europe/Madrid',
    maxHoursPerDay: 9,
    minRestHours: 12,
    manualAllowed: false,
    holidays: [],
  },
  IN: {
    timezone: 'Asia/Kolkata',
    maxHoursPerDay: 10,
    minRestHours: 10,
    manualAllowed: true,
    holidays: [],
  },
  US: {
    timezone: 'America/New_York',
    maxHoursPerDay: 12,
    minRestHours: 8,
    manualAllowed: true,
    holidays: [],
  },
};
