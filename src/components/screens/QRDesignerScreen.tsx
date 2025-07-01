import React, { useState, useEffect } from 'react';
import { Plus, Palette } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { useQRTemplates, useStations } from '../../hooks/useData';
import { useApp } from '../../contexts/AppContext';
import type { QRTemplate } from '../../types';

export function QRDesignerScreen() {
  const { state, showNotification } = useApp();
  const { data: templates, create, update, remove } = useQRTemplates();
  const { data: stations } = useStations();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<QRTemplate | null>(null);
  const [form, setForm] = useState<Partial<QRTemplate>>({
    colors: { foreground: '#000000', background: '#ffffff' },
    instructions: { es: '', en: '' },
    header: '',
    footer: '',
    isDefault: false
  });
  const currentCompany = state.currentCompany;

  const openCreate = () => {
    setEditing(null);
    setForm({
      colors: { foreground: '#000000', background: '#ffffff' },
      instructions: { es: '', en: '' },
      header: '',
      footer: '',
      isDefault: false
    });
    setShowModal(true);
  };

  const saveTemplate = async () => {
    if (!form.name || !form.stationId) {
      showNotification({ type: 'error', title: 'Error', message: 'Completa nombre y estación' });
      return;
    }
    const data: Omit<QRTemplate, keyof QRTemplate> & Partial<QRTemplate> = {
      ...form,
      companyId: currentCompany?.id || '',
    } as QRTemplate;

    if (editing) {
      const res = await update(editing.id, data);
      if (res) showNotification({ type: 'success', title: 'Actualizado', message: 'Plantilla guardada', autoClose: true });
    } else {
      const res = await create(data as any);
      if (res) showNotification({ type: 'success', title: 'Creado', message: 'Plantilla creada', autoClose: true });
    }
    setShowModal(false);
  };

  const deleteTemplate = async (id: string) => {
    const ok = await remove(id);
    if (ok) showNotification({ type: 'success', title: 'Eliminado', message: 'Plantilla eliminada', autoClose: true });
  };

  const Preview = () => (
    <div className="border rounded-lg p-4" style={{ backgroundColor: form.colors?.background || '#ffffff', color: form.colors?.foreground || '#000000' }}>
      <div className="text-center font-semibold mb-2">{form.header}</div>
      <div className="border h-24 flex items-center justify-center mb-2">QR</div>
      <div className="text-center text-sm whitespace-pre-line">{form.instructions?.es}</div>
      <div className="text-center mt-2 text-xs">{form.footer}</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Plantillas de QR</h2>
        <Button icon={Plus} onClick={openCreate}>Nueva Plantilla</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map(t => (
          <Card key={t.id} hover>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>{t.name}</CardTitle>
              <div className="flex space-x-2">
                <Button size="sm" variant="secondary" onClick={() => { setEditing(t); setForm(t); setShowModal(true); }}>Editar</Button>
                <Button size="sm" variant="danger" onClick={() => deleteTemplate(t.id)}>Eliminar</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 mb-2">Estación: {stations?.find(s => s.id === t.stationId)?.name || t.stationId}</div>
              <div className="border rounded p-2 text-center" style={{ backgroundColor: t.colors.background, color: t.colors.foreground }}>
                {t.header}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Editar Plantilla" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
          <select className="border rounded-lg px-3 py-2" value={form.stationId || ''} onChange={e => setForm({ ...form, stationId: e.target.value })}>
            <option value="">Estación</option>
            {stations?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input label="Color de texto" type="color" value={form.colors?.foreground || '#000000'} onChange={e => setForm({ ...form, colors: { ...(form.colors || {}), foreground: e.target.value } })} />
          <Input label="Color de fondo" type="color" value={form.colors?.background || '#ffffff'} onChange={e => setForm({ ...form, colors: { ...(form.colors || {}), background: e.target.value } })} />
          <Input label="Encabezado" value={form.header || ''} onChange={e => setForm({ ...form, header: e.target.value })} />
          <Input label="Pie" value={form.footer || ''} onChange={e => setForm({ ...form, footer: e.target.value })} />
          <Textarea label="Instrucciones (ES)" value={form.instructions?.es || ''} onChange={e => setForm({ ...form, instructions: { ...(form.instructions || {}), es: e.target.value } })} rows={3} />
          <Textarea label="Instrucciones (EN)" value={form.instructions?.en || ''} onChange={e => setForm({ ...form, instructions: { ...(form.instructions || {}), en: e.target.value } })} rows={3} />
        </div>
        <div className="mt-4">
          <Preview />
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button icon={Palette} onClick={saveTemplate}>Guardar</Button>
        </div>
      </Modal>
    </div>
  );
}
