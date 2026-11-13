import type { ReactNode } from "react";

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = { top: 12, right: 12, bottom: 28, left: 44 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

export interface ChartSeries {
  name: string;
  /** A Tailwind stroke or fill class, e.g. "stroke-primary-600". */
  className: string;
  values: number[];
}

interface AxisProps {
  max: number;
  formatValue: (value: number) => string;
}

function YAxis({ max, formatValue }: AxisProps): ReactNode {
  return (
    <g aria-hidden="true">
      {[0, 0.5, 1].map((fraction) => {
        const y = PADDING.top + PLOT_HEIGHT * (1 - fraction);
        return (
          <g key={fraction}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y}
              y2={y}
              className="stroke-greyscale-200"
            />
            <text
              x={PADDING.left - 6}
              y={y + 4}
              textAnchor="end"
              className="fill-greyscale-600 text-[11px]"
            >
              {formatValue(max * fraction)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function xLabelIndexes(count: number): number[] {
  if (count <= 1) return [0];
  return count <= 6
    ? Array.from({ length: count }, (_, index) => index)
    : [0, Math.floor((count - 1) / 2), count - 1];
}

/**
 * A plain SVG line chart. The SVG is labeled for screen readers by `label`; pair it with a data table for the numbers.
 *
 * @example
 * <LineChart label="Resolved share over time" labels={["Nov 9", "Nov 10"]} series={[{ name: "Resolved", className: "stroke-primary-600", values: [0.8, 0.9] }]} max={1} formatValue={(v) => `${Math.round(v * 100)}%`} />
 */
export function LineChart({
  label,
  labels,
  series,
  max,
  formatValue,
}: {
  label: string;
  labels: string[];
  series: ChartSeries[];
  max: number;
  formatValue: (value: number) => string;
}): ReactNode {
  const scaleMax = max > 0 ? max : 1;
  const x = (index: number) =>
    PADDING.left +
    (labels.length <= 1
      ? PLOT_WIDTH / 2
      : (PLOT_WIDTH * index) / (labels.length - 1));
  const y = (value: number) =>
    PADDING.top + PLOT_HEIGHT * (1 - Math.min(value, scaleMax) / scaleMax);

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={label}
        className="h-auto w-full"
      >
        <YAxis max={scaleMax} formatValue={formatValue} />
        {series.map((line) => (
          <g key={line.name}>
            <polyline
              fill="none"
              strokeWidth={2}
              className={line.className}
              points={line.values
                .map((value, index) => `${x(index)},${y(value)}`)
                .join(" ")}
            />
            {line.values.map((value, index) => (
              <circle
                key={index}
                cx={x(index)}
                cy={y(value)}
                r={3}
                className={line.className.replace("stroke-", "fill-")}
              />
            ))}
          </g>
        ))}
        <g aria-hidden="true">
          {xLabelIndexes(labels.length).map((index) => (
            <text
              key={index}
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-greyscale-600 text-[11px]"
            >
              {labels[index]}
            </text>
          ))}
        </g>
      </svg>
      <ChartLegend series={series} />
    </div>
  );
}

/**
 * A plain SVG bar chart with one bar per label.
 *
 * @example
 * <BarChart label="Decisions per week" labels={["Nov 2", "Nov 9"]} values={[4, 14]} className="fill-secondary-500" formatValue={String} />
 */
export function BarChart({
  label,
  labels,
  values,
  className,
  formatValue,
  max,
}: {
  label: string;
  labels: string[];
  values: number[];
  className: string;
  formatValue: (value: number) => string;
  max?: number;
}): ReactNode {
  const scaleMax = max ?? Math.max(1, ...values);
  const slot = PLOT_WIDTH / Math.max(1, values.length);
  const barWidth = Math.min(48, slot * 0.6);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className="h-auto w-full"
    >
      <YAxis max={scaleMax} formatValue={formatValue} />
      {values.map((value, index) => {
        const height = (PLOT_HEIGHT * Math.min(value, scaleMax)) / scaleMax;
        const x = PADDING.left + slot * index + (slot - barWidth) / 2;
        return (
          <rect
            key={index}
            x={x}
            y={PADDING.top + PLOT_HEIGHT - height}
            width={barWidth}
            height={height}
            rx={2}
            className={className}
          />
        );
      })}
      <g aria-hidden="true">
        {xLabelIndexes(labels.length).map((index) => (
          <text
            key={index}
            x={PADDING.left + slot * index + slot / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-greyscale-600 text-[11px]"
          >
            {labels[index]}
          </text>
        ))}
      </g>
    </svg>
  );
}

function ChartLegend({ series }: { series: ChartSeries[] }): ReactNode {
  if (series.length < 2) return null;
  return (
    <ul
      aria-hidden="true"
      className="flex flex-wrap gap-4 text-xs text-greyscale-700"
    >
      {series.map((line) => (
        <li key={line.name} className="flex items-center gap-1.5">
          <svg width="16" height="4" aria-hidden="true">
            <line
              x1="0"
              x2="16"
              y1="2"
              y2="2"
              strokeWidth={3}
              className={line.className}
            />
          </svg>
          {line.name}
        </li>
      ))}
    </ul>
  );
}

/**
 * The numbers behind a chart, as a real table.
 *
 * @example
 * <DataTable caption="Coverage by snapshot" columns={["Taken", "Resolved"]} rows={[["Nov 9", "81%"]]} />
 */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
}): ReactNode {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="max-h-64 overflow-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <table className="w-full text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-white text-greyscale-600">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="py-1 pr-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-greyscale-100 text-greyscale-800">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-1 pr-3 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
