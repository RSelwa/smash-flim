import { type PointerEvent, useEffect, useId, useRef, useState } from "react"
import { scaleLinear } from "d3-scale"
import { area, curveMonotoneX, line } from "d3-shape"

const MARGIN = { top: 12, right: 16, bottom: 28, left: 44 }
const END_LABEL_WIDTH = 96
const END_LABEL_GAP = 8
const AXIS_LABEL_GAP = 10
const DEFAULT_Y_TICK_COUNT = 4
const MAX_X_TICKS = 8
const LINE_WIDTH = 2
const GLOW_WIDTH = 4
const GLOW_BLUR = 4
const GLOW_OPACITY = 0.2
const AREA_OPACITY = 0.2
const DOT_RADIUS = 4
const TOOLTIP_OFFSET = 12
const NON_ID_CHARACTERS = /[^\w-]/g

type ChartRow = Record<string, unknown> & { label: string }

type ChartSeries = {
  dataKey: string
  label: string
  color: string
}

type LineChartProps = {
  data: ChartRow[]
  series: ChartSeries[]
  xKey: string
  formatValue: (value: number) => string
  yTickCount?: number
  hasArea?: boolean
  hasEndLabels?: boolean
}

const toNumber = (value: unknown) => (typeof value === "number" ? value : 0)

export const LineChart = ({
  data,
  series,
  xKey,
  formatValue,
  yTickCount = DEFAULT_Y_TICK_COUNT,
  hasArea = false,
  hasEndLabels = false,
}: LineChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const id = useId().replace(NON_ID_CHARACTERS, "")

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const marginRight = hasEndLabels ? END_LABEL_WIDTH : MARGIN.right
  const plotWidth = Math.max(0, size.width - MARGIN.left - marginRight)
  const plotHeight = Math.max(0, size.height - MARGIN.top - MARGIN.bottom)
  const values = data.flatMap((row) =>
    series.map(({ dataKey }) => toNumber(row[dataKey])),
  )
  const x = scaleLinear()
    .domain([0, Math.max(1, data.length - 1)])
    .range([0, plotWidth])
  const y = scaleLinear()
    .domain([0, Math.max(1, ...values)])
    .nice(yTickCount)
    .range([plotHeight, 0])
  const yTicks = y.ticks(yTickCount)
  const xTickStep = Math.ceil(data.length / MAX_X_TICKS)
  const toLinePath = line<number>()
    .x((_, index) => x(index))
    .y((value) => y(value))
    .curve(curveMonotoneX)
  const toAreaPath = area<number>()
    .x((_, index) => x(index))
    .y0(plotHeight)
    .y1((value) => y(value))
    .curve(curveMonotoneX)
  const curves = series.map((item) => {
    const points = data.map((row) => toNumber(row[item.dataKey]))
    return {
      ...item,
      points,
      linePath: toLinePath(points) ?? "",
      areaPath: toAreaPath(points) ?? "",
    }
  })

  const hoverRow = hoverIndex === null ? undefined : data[hoverIndex]
  const hoverItems =
    hoverIndex === null
      ? []
      : curves
          .map(({ dataKey, label, color, points }) => ({
            dataKey,
            label,
            color,
            value: points[hoverIndex] ?? 0,
          }))
          .toSorted((a, b) => b.value - a.value)
  const isTooltipOnRight = hoverIndex !== null && x(hoverIndex) < plotWidth / 2

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const { left } = event.currentTarget.getBoundingClientRect()
    const index = Math.round(x.invert(event.clientX - left - MARGIN.left))
    setHoverIndex(Math.min(data.length - 1, Math.max(0, index)))
  }

  return (
    <div
      ref={containerRef}
      className="relative size-full"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <svg
        width={size.width}
        height={size.height}
        className="absolute inset-0 overflow-visible"
        role="img"
        aria-label="Chart"
      >
        <defs>
          <filter
            id={`${id}-glow`}
            filterUnits="userSpaceOnUse"
            x={-MARGIN.left}
            y={-MARGIN.top}
            width={size.width}
            height={size.height}
          >
            <feGaussianBlur stdDeviation={GLOW_BLUR} />
          </filter>
          {hasArea &&
            curves.map(({ dataKey, color }) => (
              <linearGradient
                key={dataKey}
                id={`${id}-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor={color} stopOpacity={AREA_OPACITY} />
                <stop offset="1" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <g className="stroke-border">
            {yTicks.map((tick) => (
              <line key={tick} x2={plotWidth} y1={y(tick)} y2={y(tick)} />
            ))}
          </g>
          <g className="fill-muted-foreground font-mono text-[10px] tabular-nums">
            {yTicks.map((tick) => (
              <text
                key={tick}
                x={-AXIS_LABEL_GAP}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="central"
              >
                {formatValue(tick)}
              </text>
            ))}
          </g>
          <g className="fill-muted-foreground font-mono text-[10px] tabular-nums">
            {data.map(
              (row, index) =>
                index % xTickStep === 0 && (
                  <text
                    key={row.label}
                    x={x(index)}
                    y={plotHeight + AXIS_LABEL_GAP}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                  >
                    {String(row[xKey])}
                  </text>
                ),
            )}
          </g>
          {hoverIndex !== null && (
            <line
              x1={x(hoverIndex)}
              x2={x(hoverIndex)}
              y2={plotHeight}
              className="stroke-muted-foreground/40"
            />
          )}
          {curves.toReversed().map(({ dataKey, color, linePath, areaPath }) => (
            <g key={dataKey}>
              {hasArea && <path d={areaPath} fill={`url(#${id}-${dataKey})`} />}
              <path
                d={linePath}
                pathLength={1}
                strokeDasharray={1}
                fill="none"
                stroke={color}
                strokeWidth={GLOW_WIDTH}
                opacity={GLOW_OPACITY}
                filter={`url(#${id}-glow)`}
                className="animate-draw-line motion-reduce:animate-none"
              />
              <path
                d={linePath}
                pathLength={1}
                strokeDasharray={1}
                fill="none"
                stroke={color}
                strokeWidth={LINE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-draw-line motion-reduce:animate-none"
              />
            </g>
          ))}
          {hoverIndex !== null &&
            curves.map(({ dataKey, color, points }) => (
              <circle
                key={dataKey}
                cx={x(hoverIndex)}
                cy={y(points[hoverIndex] ?? 0)}
                r={DOT_RADIUS}
                fill={color}
                strokeWidth={2}
                className="stroke-card"
              />
            ))}
          {hasEndLabels && (
            <g className="fill-foreground text-xs">
              {curves.map(({ dataKey, label, points }) => {
                const lastPoint = points.at(-1)
                if (!lastPoint) return null
                return (
                  <text
                    key={dataKey}
                    x={plotWidth + END_LABEL_GAP}
                    y={y(lastPoint)}
                    dominantBaseline="central"
                  >
                    {label}
                  </text>
                )
              })}
            </g>
          )}
        </g>
      </svg>
      {hoverRow && (
        <div
          className="pointer-events-none absolute z-10 grid min-w-36 gap-1 rounded-lg border bg-popover px-3 py-2 shadow-sm"
          style={{
            top: MARGIN.top,
            left: MARGIN.left + x(hoverIndex ?? 0),
            transform: isTooltipOnRight
              ? `translateX(${TOOLTIP_OFFSET}px)`
              : `translateX(calc(-100% - ${TOOLTIP_OFFSET}px))`,
          }}
        >
          <p className="font-mono text-[10px] text-muted-foreground">
            {hoverRow.label}
          </p>
          {hoverItems.map(({ dataKey, label, color, value }) => (
            <p
              key={dataKey}
              className="flex items-center gap-2 font-mono text-[11px] tabular-nums"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{label}</span>
              <span className="ml-auto pl-4 text-popover-foreground">
                {formatValue(value)}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
