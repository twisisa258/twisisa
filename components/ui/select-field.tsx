'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check } from 'lucide-react'

export type SelectOption = { value: string; label: string }

type SelectFieldProps = {
  name: string
  label: string
  options: SelectOption[]
  placeholder?: string
  defaultValue?: string
  required?: boolean
  requiredMessage?: string
  triggerClassName?: string
  /** Chamado com o valor escolhido (e uma vez ao montar), para formulários que dependem da escolha. */
  onValueChange?: (value: string) => void
}

// Selector personalizado (sem o menu nativo do sistema). Funciona dentro de <form>:
// o valor escolhido é enviado no campo `name`, tal como num selector nativo.
export function SelectField({
  name,
  label,
  options,
  placeholder = 'Seleccionar',
  defaultValue = '',
  required = false,
  requiredMessage = 'Selecciona uma opção.',
  triggerClassName = '',
  onValueChange,
}: SelectFieldProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const proxyRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const onValueChangeRef = useRef(onValueChange)
  onValueChangeRef.current = onValueChange
  useEffect(() => {
    onValueChangeRef.current?.(value)
  }, [value])
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [active, setActive] = useState(0)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  // Validação nativa do formulário (campo obrigatório) com mensagem própria.
  useEffect(() => {
    proxyRef.current?.setCustomValidity(required && !value ? requiredMessage : '')
  }, [required, requiredMessage, value])

  useEffect(() => {
    if (!open) return
    listRef.current?.focus({ preventScroll: true })
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, id])

  function openList() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const below = window.innerHeight - rect.bottom
      setDropUp(below < 280 && rect.top > below)
    }
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (!option) return
    setValue(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList()
    }
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(index + 1, last))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(last)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const letter = event.key.toLowerCase()
          const next = options.findIndex((option, index) => index > active && option.label.toLowerCase().startsWith(letter))
          const found = next >= 0 ? next : options.findIndex((option) => option.label.toLowerCase().startsWith(letter))
          if (found >= 0) setActive(found)
        }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${selected ? selected.label : placeholder}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 text-left ${triggerClassName}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-[#929b94]'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          width="16"
          height="16"
          className={`shrink-0 text-[#737c75] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <input
        ref={proxyRef}
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
      />

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-option-${active}`}
          onKeyDown={onListKeyDown}
          className={`absolute inset-x-0 z-30 max-h-64 overflow-auto rounded-xl border border-[#dfe3d9] bg-white p-1 text-[#202321] shadow-[0_12px_32px_rgba(35,54,44,0.14)] outline-none ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value || `empty-${index}`}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(index)}
                onPointerMove={() => setActive(index)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${index === active ? 'bg-[#f1f4ef]' : ''} ${isSelected ? 'font-semibold text-[#1d4d41]' : ''}`}
              >
                <span className="min-w-0">{option.label}</span>
                {isSelected && <Check size={16} aria-hidden="true" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
