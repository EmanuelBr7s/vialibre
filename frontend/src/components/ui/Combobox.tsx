'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { INPUT_SURFACE } from '@/components/ui/classes';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Segunda línea opcional (p. ej. programa del estudiante). */
  description?: string;
}

interface ComboboxProps {
  id: string;
  options: ComboboxOption[];
  /** Valor seleccionado; '' = sin selección. */
  value: string;
  onChange: (value: string) => void;
  /** Texto del campo vacío y de la opción que limpia la selección. */
  placeholder?: string;
  /** Si se indica, se ofrece una primera opción que deja el campo sin valor. */
  clearLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Texto cuando la búsqueda no encuentra nada. */
  emptyText?: string;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Selector con búsqueda (patrón WAI-ARIA combobox + listbox): se escribe para
 * filtrar, flechas para moverse, Enter para elegir y Escape para cerrar.
 */
export default function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  clearLabel,
  disabled = false,
  invalid = false,
  describedBy,
  emptyText = 'Sin resultados',
}: ComboboxProps) {
  const listId = `${useId()}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.value === value) ?? null;

  const items = useMemo<ComboboxOption[]>(() => {
    const needle = normalize(query.trim());
    const matches = needle
      ? options.filter((option) =>
          normalize(`${option.label} ${option.description ?? ''}`).includes(needle)
        )
      : options;
    return clearLabel && !needle ? [{ value: '', label: clearLabel }, ...matches] : matches;
  }, [options, query, clearLabel]);

  // La opción activa siempre es visible dentro de la lista.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  const openList = () => {
    if (disabled) return;
    const current = items.findIndex((item) => item.value === value);
    setActiveIndex(current >= 0 ? current : 0);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else setActiveIndex((index) => Math.min(index + 1, items.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList();
        else setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (open) {
          event.preventDefault();
          setActiveIndex(items.length - 1);
        }
        break;
      case 'Enter':
        if (open) {
          event.preventDefault();
          const option = items[activeIndex];
          if (option) choose(option);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          close();
        }
        break;
      case 'Tab':
        close();
        break;
      default:
    }
  };

  const optionId = (index: number) => `${listId}-opt-${index}`;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && items[activeIndex] ? optionId(activeIndex) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        placeholder={selected ? selected.label : placeholder}
        value={open ? query : selected?.label ?? ''}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          if (!open) setOpen(true);
        }}
        onFocus={openList}
        onClick={openList}
        onBlur={close}
        onKeyDown={onKeyDown}
        className={`${INPUT_SURFACE} py-3 pl-4 pr-11 text-fluid-sm min-h-touch truncate cursor-pointer text-gray-900 placeholder:text-gray-500 disabled:opacity-60 disabled:bg-gray-50 disabled:cursor-not-allowed ${
          invalid ? 'border-red-400' : ''
        }`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {items.length === 0 ? (
            <li role="presentation" className="px-4 py-3 text-fluid-sm text-gray-500">
              {emptyText}
            </li>
          ) : (
            items.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value || '__clear'}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  // mousedown: se elige antes de que el input pierda el foco.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex min-h-touch cursor-pointer flex-col justify-center px-4 py-2 text-fluid-sm ${
                    index === activeIndex ? 'bg-primary-50' : ''
                  } ${isSelected ? 'font-medium text-primary-700' : 'text-gray-900'} ${
                    option.value === '' ? 'text-gray-500' : ''
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.description ? (
                    <span className="truncate text-fluid-xs font-normal text-gray-500">
                      {option.description}
                    </span>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
