import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  isOpen: boolean;
  onAccept: () => void;
}

export function PrivacyDialog({ isOpen, onAccept }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Política de Privacidad" showCloseButton={false}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Para continuar debes aceptar nuestra política de privacidad.
        </p>
        <div className="text-right">
          <Button onClick={onAccept}>Aceptar</Button>
        </div>
      </div>
    </Modal>
  );
}
