import { ClockIn } from '../types';
import { getRegionRules } from './regionService';

export function validateClockIn(
  clockIns: ClockIn[],
  newClockIn: ClockIn,
  regionCode: string
): string[] {
  const rules = getRegionRules(regionCode);
  const warnings: string[] = [];

  if (!rules.manualAllowed && newClockIn.method === 'manual') {
    warnings.push('El fichaje manual no está permitido en esta región');
  }

  const dateStr = newClockIn.timestamp.split('T')[0];
  const dayRecords = clockIns
    .filter(c => c.userId === newClockIn.userId && c.timestamp.startsWith(dateStr));
  const sorted = [...dayRecords, newClockIn].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let inTime: Date | null = null;
  let workedMs = 0;

  for (const c of sorted) {
    if (c.type === 'in') {
      inTime = new Date(c.timestamp);
    } else if (c.type === 'out' && inTime) {
      workedMs += new Date(c.timestamp).getTime() - inTime.getTime();
      inTime = null;
    }
  }

  if (workedMs / 3600000 > rules.maxHoursPerDay) {
    warnings.push(
      `Has superado el máximo de ${rules.maxHoursPerDay} horas por jornada`
    );
  }

  if (newClockIn.type === 'in') {
    const lastOut = clockIns
      .filter(c => c.userId === newClockIn.userId && c.type === 'out')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (lastOut) {
      const diffH =
        (new Date(newClockIn.timestamp).getTime() - new Date(lastOut.timestamp).getTime()) /
        3600000;
      if (diffH < rules.minRestHours) {
        warnings.push(
          `Debes descansar al menos ${rules.minRestHours} horas entre jornadas`
        );
      }
    }
  }

  return warnings;
}
