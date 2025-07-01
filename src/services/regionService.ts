import { regionConfig, RegionRules } from '../regionConfig';

const REGION_OVERRIDE_KEY = 'regionOverride';
const AUTO_REGION_KEY = 'autoRegion';

export async function detectCountry(): Promise<string> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    return data.country_code || 'ES';
  } catch (error) {
    console.warn('[regionService] Failed to detect country', error);
    return 'ES';
  }
}

export async function getRegionCode(): Promise<string> {
  const override = localStorage.getItem(REGION_OVERRIDE_KEY);
  if (override) return override;
  const cached = localStorage.getItem(AUTO_REGION_KEY);
  if (cached) return cached;
  const detected = await detectCountry();
  localStorage.setItem(AUTO_REGION_KEY, detected);
  return detected;
}

export function setRegionOverride(code: string) {
  localStorage.setItem(REGION_OVERRIDE_KEY, code);
}

export function clearRegionOverride() {
  localStorage.removeItem(REGION_OVERRIDE_KEY);
}

export function getRegionRules(code: string): RegionRules {
  return regionConfig[code] || regionConfig.ES;
}
