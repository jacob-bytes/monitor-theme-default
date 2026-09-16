import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export type Option<T extends string> = { value: T; label: string }

/**
 * A single-select listbox, vendored rather than taken from radix.
 *
 * radix's Select costs about 28 kB gzipped -- a third of this theme's landing
 * page, which lazy-loads its detail view precisely to stay small. The listbox
 * pattern is small enough to own: a trigger with `aria-haspopup`, a popup with
 * `role="listbox"`, and the six keys that go with it.
 *
 * Focus never leaves the trigger. The active option is announced through
 * `aria-activedescendant`, which is what keeps the popup from needing its own
 * focus ring and roving tabindex.
 *
 * Positioned rather than portalled: no ancestor of the toolbar clips, so an
 * absolutely positioned popup cannot be cut off -- and a portal is one more way
 * for the layering to go wrong, not one fewer.
 */
export function Select<T extends string>({ value, options, onChange, label, className }: {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)))
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  const optionId = (i: number) => `${id}-${i}`
  const current = options.find((o) => o.value === value) ?? options[0]

  // Closing on a press elsewhere, before that press does its own job.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [open])

  // Opening puts the highlight on the current answer, not on the first row. Set
  // from the event that opens it, not from an effect: the click already knows,
  // and an effect would only add a second render to say so.
  const openAt = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const choose = (next: T) => {
    onChange(next)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openAt()
      }
      return
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActive((i) => Math.min(options.length - 1, i + 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case "Home":
        e.preventDefault()
        setActive(0)
        break
      case "End":
        e.preventDefault()
        setActive(options.length - 1)
        break
      case "Enter":
      case " ":
        e.preventDefault()
        choose(options[active].value)
        break
      case "Tab":
        setOpen(false)
        break
    }
  }

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={onKeyDown}
        className="inline-flex h-8 w-full items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-xs transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="truncate text-foreground">{current?.label}</span>
        <ChevronDown
          className={cn("ml-auto size-3.5 shrink-0 opacity-60 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className="absolute top-full left-0 z-50 mt-1.5 min-w-full overflow-hidden rounded-xl border bg-popover/95 p-1 shadow-pop backdrop-blur"
        >
          {options.map((o, i) => (
            <div
              key={o.value}
              id={optionId(i)}
              role="option"
              aria-selected={o.value === value}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs whitespace-nowrap transition-colors",
                i === active && "bg-accent",
                o.value === value ? "text-primary" : "text-foreground",
              )}
            >
              <Check className={cn("size-3.5 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
