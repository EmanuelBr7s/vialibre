import type { ReactNode } from 'react';

export interface ResponsiveColumn<T> {
  /** Encabezado de la columna; en la tarjeta móvil es la etiqueta del dato. */
  header: string;
  /** Contenido de la celda en la tabla de escritorio. */
  cell: (row: T) => ReactNode;
  /**
   * `primary`: encabeza la tarjeta móvil (nombre del registro).
   * `action`: va al pie de la tarjeta y alineada a la derecha en la tabla.
   */
  kind?: 'primary' | 'action';
  /** Contenido alternativo para la tarjeta móvil (p. ej. un botón a ancho completo). */
  cardCell?: (row: T) => ReactNode;
}

interface ResponsiveListProps<T> {
  /** Nombre accesible de la lista (tabla y tarjetas). */
  label: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: ResponsiveColumn<T>[];
}

/**
 * Listado de registros de las pantallas de administración: tabla desde `lg` y
 * pila de tarjetas en móvil/tablet, generadas a partir de las mismas columnas
 * (mismo patrón que el panel de administración).
 */
export default function ResponsiveList<T>({ label, rows, rowKey, columns }: ResponsiveListProps<T>) {
  const primary = columns.find((c) => c.kind === 'primary');
  const actions = columns.filter((c) => c.kind === 'action');
  const details = columns.filter((c) => c.kind === undefined);

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label={label}>
          <thead>
            <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`px-6 py-3 ${column.kind === 'action' ? 'text-right' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-gray-50 last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-6 py-3 text-gray-600 ${column.kind === 'action' ? 'text-right' : ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil/tablet: pila de tarjetas */}
      <ul className="lg:hidden space-y-3 p-4" role="list" aria-label={label}>
        {rows.map((row) => (
          <li key={rowKey(row)} role="listitem">
            <article className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              {primary ? (
                <div className="min-w-0 text-fluid-sm [&_.text-xs]:text-fluid-xs">
                  {(primary.cardCell ?? primary.cell)(row)}
                </div>
              ) : null}
              {details.length > 0 ? (
                <dl className="mt-3 grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-2">
                  {details.map((column) => (
                    <div key={column.header} className="min-w-0">
                      <dt className="text-fluid-xs uppercase tracking-wider text-gray-500">
                        {column.header}
                      </dt>
                      <dd className="text-fluid-sm text-gray-700 break-words [&_.text-xs]:text-fluid-xs">
                        {(column.cardCell ?? column.cell)(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {actions.map((column) => (
                <div key={column.header} className="mt-3">
                  {(column.cardCell ?? column.cell)(row)}
                </div>
              ))}
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
