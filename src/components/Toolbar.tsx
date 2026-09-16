import { LayoutGrid, List, Search, X } from "lucide-react"

import { Select } from "@/components/ui/select"
import type { Node } from "@/lib/api"
import { FILTERS, GROUP_KEYS, type FilterKey, type GroupKey } from "@/lib/group"
import { cn } from "@/lib/utils"

export type View = "grid" | "list"

const ALL = "all"

/**
 * Every control in this row is the same height. Three different heights read as
 * three unrelated widgets that happened to land together rather than as one
 * instrument panel.
 */
const CONTROL = "h-8"

function Toggle({ active, onClick, label, children }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded transition-colors",
        active ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/**
 * The band between the summary and the fleet.
 *
 * No totals here: the four cards above already state the fleet's size and
 * throughput, and repeating them in smaller type is noise. What this row holds is
 * the two things that act on the list below -- how it is grouped, and which part
 * of it you are looking at.
 */
export function Toolbar({ nodes, counts, view, onView, query, onQuery, filters, onFilters, group, onGroup }: {
  nodes: Node[]
  counts: { shown: number; total: number }
  view: View
  onView: (view: View) => void
  query: string
  onQuery: (query: string) => void
  filters: FilterKey[]
  onFilters: (filters: FilterKey[]) => void
  group: GroupKey | null
  onGroup: (group: GroupKey | null) => void
}) {
  const toggleFilter = (key: FilterKey) =>
    onFilters(filters.includes(key) ? filters.filter((k) => k !== key) : [...filters, key])

  // Each chip carries the size of the set it would leave you with, so a filter
  // that leads nowhere is visible before it is clicked rather than after.
  const chips = FILTERS.map((f) => ({ ...f, count: nodes.filter(f.test).length })).filter(
    (f) => f.count > 0 || filters.includes(f.key),
  )

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
      <Select
        label="分组"
        value={group ?? ALL}
        options={[{ value: ALL, label: "不分组" }, ...GROUP_KEYS.map((g) => ({ value: g.key, label: g.label }))]}
        onChange={(v) => onGroup(v === ALL ? null : (v as GroupKey))}
        className="w-32 shrink-0"
      />

      <span className={cn("w-px shrink-0 bg-border", "h-5")} aria-hidden />

      {/* One container for the whole set, the same shape as the view toggle on
          the right -- they are both segmented controls and should look like it. */}
      <div
        role="group"
        aria-label="筛选节点"
        className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-md border bg-card px-0.5", CONTROL)}
      >
        {chips.map((f) => {
          const active = filters.includes(f.key)
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleFilter(f.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded px-2 text-xs whitespace-nowrap transition-colors",
                active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tnum rounded-full px-1 text-[10px] leading-4 font-medium",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-foreground",
                )}
              >
                {f.count}
              </span>
            </button>
          )
        })}
      </div>

      {filters.length > 0 && (
        <button
          type="button"
          onClick={() => onFilters([])}
          className={cn(
            "inline-flex items-center rounded px-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline",
            CONTROL,
          )}
        >
          清除筛选
        </button>
      )}

      {/* Only while something is being hidden: a permanent "9 / 9" is a label
          that never carries information. */}
      {counts.shown !== counts.total && (
        <span className={cn("tnum inline-flex items-center px-1 text-xs text-muted-foreground", CONTROL)}>
          {counts.shown} / {counts.total} 台
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <label className={cn("relative inline-flex items-center", CONTROL)}>
          <Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="搜索节点"
            aria-label="按名称、国家或系统搜索节点"
            className="h-8 w-36 rounded-md border border-input bg-card pr-7 pl-7 text-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-48"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="清除搜索"
              className="absolute right-1.5 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </label>

        <div
          role="group"
          aria-label="切换视图"
          className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-md border bg-card px-0.5", CONTROL)}
        >
          <Toggle active={view === "grid"} onClick={() => onView("grid")} label="网格视图">
            <LayoutGrid className="size-3.5" />
          </Toggle>
          <Toggle active={view === "list"} onClick={() => onView("list")} label="列表视图">
            <List className="size-3.5" />
          </Toggle>
        </div>
      </div>
    </div>
  )
}
