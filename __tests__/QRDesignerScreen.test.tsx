import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QRDesignerScreen } from '../src/components/screens/QRDesignerScreen';
import { AppProvider } from '../src/contexts/AppContext';

function renderWithProvider(ui: JSX.Element) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('QRDesignerScreen', () => {
  it('renders form and responds to open modal', () => {
    const { getByText } = renderWithProvider(<QRDesignerScreen />);
    const addButton = getByText(/nueva plantilla/i);
    fireEvent.click(addButton);
    expect(getByText(/guardar/i)).toBeTruthy();
  });
});
