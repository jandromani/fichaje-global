import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { legalTexts, saveConsent, getPreferredLanguage } from '../../services/legalEngine';
import { useApp } from '../../contexts/AppContext';

interface Props {
  workerId: string;
  onAccepted: () => void;
}

export function LegalConsentModal({ workerId, onAccepted }: Props) {
  const lang = getPreferredLanguage();
  const text = legalTexts[lang];

  const handleAccept = () => {
    saveConsent({
      workerId,
      acceptedAt: new Date().toISOString(),
      language: lang,
      consentText: text.consent
    });
    onAccepted();
  };

  return (
    <Modal isOpen={true} onClose={() => {}} title="Legal" hideClose>
      <p className="mb-4 text-sm whitespace-pre-line">{text.consent}</p>
      <Button onClick={handleAccept} className="w-full mt-2">
        Aceptar
      </Button>
    </Modal>
  );
}
