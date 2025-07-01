import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useApp } from '../../contexts/AppContext';
import { regionConfig } from '../../regionConfig';

export function PolicyScreen() {
  const { state } = useApp();
  const rules = regionConfig[state.regionCode] || regionConfig.ES;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Política Laboral</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reglas para {state.regionCode}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Zona horaria: {rules.timezone}</p>
          <p>Máximo horas por jornada: {rules.maxHoursPerDay}</p>
          <p>Descanso mínimo entre jornadas: {rules.minRestHours} h</p>
          <p>Fichaje manual: {rules.manualAllowed ? 'Permitido' : 'No permitido'}</p>
        </CardContent>
      </Card>
      {state.appMode.mode === 'demo' && (
        <Badge variant="info">Modo DEMO – algunas configuraciones están simuladas</Badge>
      )}
    </div>
  );
}
