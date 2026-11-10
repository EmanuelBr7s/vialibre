import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferenceSelect, { UNVERIFIED_REFERENCE_NOTICE } from '@/components/admin/ReferenceSelect';

const OPTIONS = [
  { value: '11111111-1111-1111-1111-111111111111', label: 'Empresa A' },
  { value: '22222222-2222-2222-2222-222222222222', label: 'Empresa B' },
];

describe('ReferenceSelect', () => {
  it('lista las opciones y la opción vacía «Sin asignar»', () => {
    render(
      <ReferenceSelect id="emp" label="Empresa" options={OPTIONS} value={null} onChange={() => {}} />
    );

    const select = screen.getByLabelText('Empresa') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByRole('option', { name: 'Sin asignar' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Empresa A' })).toBeInTheDocument();
  });

  it('emite el UUID al elegir una referencia y null al vaciar', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ReferenceSelect id="emp" label="Empresa" options={OPTIONS} value={null} onChange={onChange} />
    );

    await user.selectOptions(screen.getByLabelText('Empresa'), OPTIONS[1].value);
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1].value);

    await user.selectOptions(screen.getByLabelText('Empresa'), '');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('muestra el aviso obligatorio cuando notice está activo', () => {
    render(
      <ReferenceSelect
        id="emp"
        label="Empresa"
        options={OPTIONS}
        value={null}
        onChange={() => {}}
        notice
      />
    );
    expect(screen.getByText(UNVERIFIED_REFERENCE_NOTICE)).toBeInTheDocument();
  });

  it('no muestra el aviso por defecto', () => {
    render(
      <ReferenceSelect id="emp" label="Empresa" options={OPTIONS} value={null} onChange={() => {}} />
    );
    expect(screen.queryByText(UNVERIFIED_REFERENCE_NOTICE)).not.toBeInTheDocument();
  });

  it('se deshabilita y avisa mientras carga', () => {
    render(
      <ReferenceSelect
        id="emp"
        label="Empresa"
        options={[]}
        value={null}
        onChange={() => {}}
        loading
      />
    );
    expect(screen.getByLabelText('Empresa')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Cargando…' })).toBeInTheDocument();
  });

  it('se deshabilita y muestra el error sin permitir UUID arbitrarios', () => {
    render(
      <ReferenceSelect
        id="emp"
        label="Empresa"
        options={[]}
        value={null}
        onChange={() => {}}
        error="No se pudieron cargar las empresas"
      />
    );
    expect(screen.getByLabelText('Empresa')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las empresas');
  });

  it('indica cuando no hay registros disponibles', () => {
    render(
      <ReferenceSelect id="emp" label="Empresa" options={[]} value={null} onChange={() => {}} />
    );
    expect(screen.getByText('No hay registros disponibles para seleccionar.')).toBeInTheDocument();
  });

  it('preserva un valor desconocido como referencia no verificada', () => {
    render(
      <ReferenceSelect
        id="emp"
        label="Empresa"
        options={OPTIONS}
        value="99999999-9999-9999-9999-999999999999"
        onChange={() => {}}
      />
    );
    expect(
      screen.getByRole('option', { name: /99999999-9999-9999-9999-999999999999/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El valor guardado no está en la lista de opciones/i)
    ).toBeInTheDocument();
  });
});
