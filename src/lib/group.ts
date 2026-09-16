import type { Node } from "@/lib/api"
import { CYCLES, daysUntil, osName } from "@/lib/format"
import { deployed } from "@/components/NodeCard"

/**
 * Grouping keys that a node already carries. There is no operator-defined
 * category on the hub -- `remark` is panel-only by an explicit privacy contract
 * -- so a group is always derived from something the node reports about itself.
 */
export type GroupKey = "os" | "virt" | "billing_cycle"

export const GROUP_KEYS: { key: GroupKey; label: string }[] = [
  { key: "os", label: "系统" },
  { key: "virt", label: "虚拟化" },
  { key: "billing_cycle", label: "计费周期" },
]

export type Group = { label: string | null; nodes: Node[] }

const UNKNOWN = "未知"

/** The bucket a node falls in for one key. Empty values share a single bucket. */
function label(node: Node, key: GroupKey): string {
  switch (key) {
    case "os":
      return node.os ? osName(node.os) : UNKNOWN
    // `none` is "there is no virtualisation", which is a fact, not a gap in the
    // data the way an empty distro string is.
    case "virt":
      return !node.virt || node.virt === "none" ? "物理机" : node.virt
    case "billing_cycle":
      return node.price > 0 ? (CYCLES[node.billing_cycle] ?? node.billing_cycle) : "免费"
  }
}

/**
 * Buckets in an order that does not move.
 *
 * The page receives a frame every two seconds, so the ordering may only depend on
 * things a frame does not change: the label and how many nodes are in the group.
 * Ordering by a live figure -- mean CPU, say -- would reshuffle the whole page
 * twice a second.
 */
export function groupNodes(nodes: Node[], key: GroupKey): Group[] {
  const buckets = new Map<string, Node[]>()
  for (const node of nodes) {
    const name = label(node, key)
    const bucket = buckets.get(name)
    if (bucket) bucket.push(node)
    else buckets.set(name, [node])
  }
  return [...buckets.entries()]
    .map(([label, nodes]) => ({ label, nodes }))
    .sort(
      (a, b) =>
        (a.label === UNKNOWN ? 1 : 0) - (b.label === UNKNOWN ? 1 : 0) ||
        b.nodes.length - a.nodes.length ||
        a.label.localeCompare(b.label, "zh"),
    )
}

/** One thing worth narrowing the fleet to. */
export type FilterKey = "loaded" | "offline" | "expiring" | "expired" | "unreported"

export const FILTERS: {
  key: FilterKey
  label: string
  tone?: string
  test: (node: Node) => boolean
}[] = [
  // The order is the order of the questions an operator asks: what is on fire,
  // what has stopped answering, what is about to cost money.
  { key: "loaded", label: "高负载", tone: "text-warn-fg", test: (n) => (n.metrics?.cpu ?? 0) >= 80 },
  { key: "offline", label: "离线", tone: "text-danger-fg", test: (n) => !n.online && deployed(n) },
  { key: "expiring", label: "即将到期", tone: "text-warn-fg", test: (n) => within(n, 0, 30) },
  { key: "expired", label: "已过期", tone: "text-danger-fg", test: (n) => within(n, null, -1) },
  { key: "unreported", label: "未接入", test: (n) => !deployed(n) },
]

function within(node: Node, from: number | null, to: number): boolean {
  const days = daysUntil(node.expires_at)
  if (days === null) return false
  return from === null ? days < 0 : days >= from && days <= to
}

export function matches(node: Node, keys: FilterKey[]): boolean {
  return keys.every((key) => FILTERS.find((f) => f.key === key)?.test(node) ?? true)
}
