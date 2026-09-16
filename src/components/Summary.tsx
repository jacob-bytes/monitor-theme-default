import { Activity, ArrowDown, ArrowDownUp, ArrowUp, Gauge, Server } from "lucide-react"

import { Card } from "@/components/ui/card"
import { speedHistory, type Node } from "@/lib/api"
import { bytes, rate } from "@/lib/format"
import { cn } from "@/lib/utils"

function Tile({ icon: Icon, label, children }: {
  icon: typeof Server; label: string; children: React.ReactNode
}) {
  return (
    <Card className="gap-0 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      {children}
    </Card>
  )
}

/**
 * In and out side by side, the form every traffic figure on this page takes.
 * Stacked below sm, where two tiles share a phone's width and "23.3 MB" has
 * roughly 70px available.
 */
function Flow({ down, up, className }: { down: string; up: string; className?: string }) {
  return (
    <div className={cn("tnum grid grid-cols-1 gap-x-2 sm:grid-cols-2", className)}>
      <span className="inline-flex items-center gap-1">
        <ArrowDown className="size-3 shrink-0 text-muted-foreground" />
        {down}
      </span>
      <span className="inline-flex items-center gap-1">
        <ArrowUp className="size-3 shrink-0 text-muted-foreground" />
        {up}
      </span>
    </div>
  )
}

/**
 * A bare polyline with no axes or tooltips: at this size only the shape is
 * legible, and recharts would bring a full chart's machinery for it. Series share
 * one scale so the two throughput lines remain comparable. They take two cool
 * hues rather than the ok/warn pair on purpose: inbound and outbound are
 * directions, not verdicts, and green here would read as praise for one series.
 */
function Spark({ series }: { series: { values: number[]; className: string }[] }) {
  const top = Math.max(...series.flatMap((s) => s.values), 1)
  const width = Math.max(...series.map((s) => s.values.length), 2) - 1
  const line = (values: number[]) => values.map((v, x) => `${(x / width) * 100},${23 - (v / top) * 22}`).join(" ")
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      {/* A wash under the inbound line. Two bare polylines a few pixels apart are
          hard to tell apart at this size, and the fill separates them into a
          foreground and a background without spending a second bright hue.
          The stop colour is written out rather than left to currentColor: inside
          a gradient, currentColor resolves against the gradient element, not
          against the shape that references it. */}
      <defs>
        <linearGradient id="spark-inbound" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,24 ${line(series[0].values)} 100,24`} fill="url(#spark-inbound)" />
      {series.map((s, i) => (
        <polyline
          key={i}
          className={s.className}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          points={line(s.values)}
        />
      ))}
    </svg>
  )
}

export function Summary({ nodes }: { nodes: Node[] }) {
  const online = nodes.filter((n) => n.online)
  const offline = nodes.length - online.length
  const sum = (pick: (n: Node) => number) => nodes.reduce((total, n) => total + pick(n), 0)

  // The busiest node rather than the average: one machine at 95% is what matters,
  // and a fleet of idle ones would average it away.
  const busiest = online.reduce<Node | null>(
    (top, n) => (n.metrics && (!top || n.metrics.cpu > top.metrics!.cpu) ? n : top),
    null,
  )
  const cpu = busiest?.metrics?.cpu ?? 0
  // Only the name gets a colour, and only once the number above it is worth
  // acting on: a muted label on every tile keeps the four reading as equals.
  const tone = cpu >= 90 ? "text-danger-fg" : cpu >= 75 ? "text-warn-fg" : "text-muted-foreground"
  // The same push produced `nodes` and this sample, so the figure above the line
  // is that line's last point.
  const now = speedHistory.at(-1) ?? { rx: 0, tx: 0 }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile icon={Server} label="节点">
        <div className="tnum mt-1 text-xl font-semibold">
          {online.length} / {nodes.length}
        </div>
        {/* mt-auto rather than a rule: the four tiles stretch to the tallest in
            the row, and the footnote belongs on the floor of the card. */}
        <div className="mt-auto pt-1 text-xs text-muted-foreground">
          {offline > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-danger-fg">
              <span className="size-1.5 rounded-full bg-destructive" />
              {offline} 个离线
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-ok" />
              全部在线
            </span>
          )}
        </div>
      </Tile>

      <Tile icon={Activity} label="最忙节点">
        <div className="tnum mt-1 text-xl font-semibold">{busiest ? `${cpu.toFixed(1)}%` : "—"}</div>
        <div className={cn("mt-auto truncate pt-1 text-xs", tone)}>{busiest ? busiest.name : "无在线节点"}</div>
      </Tile>

      <Tile icon={ArrowDownUp} label="今日流量">
        <Flow
          down={bytes(sum((n) => n.day_rx))}
          up={bytes(sum((n) => n.day_tx))}
          className="mt-1 text-sm font-semibold"
        />
        <div className="mt-2 text-xs text-muted-foreground">总流量</div>
        <Flow down={bytes(sum((n) => n.total_rx))} up={bytes(sum((n) => n.total_tx))} className="mt-0.5 text-sm" />
      </Tile>

      <Tile icon={Gauge} label="实时网速">
        <Flow down={rate(now.rx)} up={rate(now.tx)} className="mt-1 text-sm font-semibold" />
        <div className="mt-auto pt-1">
          <Spark
            series={[
              { values: speedHistory.map((s) => s.rx), className: "text-chart-1" },
              { values: speedHistory.map((s) => s.tx), className: "text-chart-4" },
            ]}
          />
        </div>
      </Tile>
    </div>
  )
}
