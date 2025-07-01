import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { legalTexts, getPreferredLanguage } from '../../services/legalEngine';
import { Button } from '../ui/Button';
import { useApp } from '../../contexts/AppContext';

export function LegalInfoScreen() {
  const lang = getPreferredLanguage();
  const { navigateTo } = useApp();
  const text = legalTexts[lang];

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Política de Privacidad</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {text.privacy.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>¿Esto es legal en mi país?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-2">{text.aid}</p>
          <p className="text-xs text-gray-600">{text.disclaimer}</p>
        </CardContent>
      </Card>
      <Button onClick={() => navigateTo('settings')}>Volver</Button>
    </div>
  );
}
