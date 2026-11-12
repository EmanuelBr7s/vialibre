import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferenceSelect, { UNVERIFIED_REFERENCE_NOTICE } from '@/components/admin/ReferenceSelect';

const OPTIONS = [
  { value: '11111111-1111-1111-1111-111111111111', label: 'Empresa A' },
  { value: '22222222-2222-2222-2222-222222222222', label: 'Empresa B' },
];

describe('ReferenceSelect', () => {
  it('lista las opciones y la opción vacía «Sin asignar»', async () => {
    const user = userEvent.setup();
    render(
      <ReferenceSelect id="emp" label="Empresa" options={OPTIONS} value={null} onChange={() => {}} />
    );

    const combo = screen.getByRole('combobox', { name: 'Empresa' }) as HTMLInputElement;
    expect(combo.value).toBe('');
    await user.click(combo);
    expect(screen.getByRole('option', { name: 'Sin asignar' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Empresa A' })).toBeInTheDocument();
  });

  it('filtra las opciones al escribir y avisa cuando no hay coincidencias', async () => {
    const user = userEvent.setup();
    render(
      <ReferenceSelect id="emp" label="Empresa" options={OPTIONS} value={null} onChange={() => {}} />
    );

    const combo = screen.getByRole('combobox', { name: 'Empresa' });
    await user.type(combo, 'empresa b');
    expect(screen.getByRole('option', { name: 'Empresa B' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Empresa A' })).not.toBeInTheDocument();

    await user.clear(combo);
    await user.type(combo, 'zzz');
    expect(screen.getAllByText('Sin resultados').length).toBeGreaterThan(0);
  });

  it('se puede elegir solo con el teclado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ReferenceSelect id="emp" label="Empresa" options={OPTIONS} value={null} onChange={onChange} />
    );

    await user.tab();
    // La lista no se abre sola al recibir el foco: la primera flecha la abre.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1].value);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('emite el UUID al elegir una referencia y null al vaciar', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ReferenceSelect id="emp" label="Empresa" options={OPTIONS} value={null} onChange={onChange} />
    );

    await user.click(screen.getByRole('combobox', { name: 'Empresa' }));
    await user.click(screen.getByRole('option', { name: 'Empresa B' }));
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1].value);

    await user.click(screen.getByRole('combobox', { name: 'Empresa' }));
    await user.click(screen.getByRole('option', { name: 'Sin asignar' }));
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
    expect(screen.getByPlaceholderText('Cargando…')).toBeInTheDocument();
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

  it('ofrece registrar el primer elemento cuando la lista está vacía', () => {
    render(
      <ReferenceSelect
        id="emp"
        label="Empresa"
        options={[]}
        value={null}
        onChange={() => {}}
        emptyText="Aún no hay empresas registradas."
        emptyAction={{ href: '/admin/empresas', label: 'Registrar empresa' }}
      />
    );
    expect(screen.getByRole('link', { name: 'Registrar empresa' })).toHaveAttribute(
      'href',
      '/admin/empresas'
    );
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
      (screen.getByRole('combobox', { name: 'Empresa' }) as HTMLInputElement).value
    ).toMatch(/…9999 \(referencia no verificada\)/);
    expect(
      screen.getByText(/El valor guardado no está en la lista de opciones/i)
    ).toBeInTheDocument();
  });
});
