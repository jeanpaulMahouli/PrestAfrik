"use client";

import { useId, useMemo, useRef, useState } from "react";

export type SeriesPoint = { label: string; value: number };

type ChartProps = {
  kind: "line" | "bar";
  points: SeriesPoint[];
  /** Nom de la mesure (« Commandes », « Argent encaissé »), lu dans l’info-bulle et le tableau. */
  measure: string;
  unit: "orders" | "fcfa";
  /** Un point par jour, ou par semaine (période de 3 mois). */
  bucket: "day" | "week";
};

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const dayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const shortDayFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

function formatters(unit: ChartProps["unit"], bucket: ChartProps["bucket"]) {
  const date = (label: string) => new Date(`${label}T00:00:00.000Z`);
  return {
    format: (value: number) =>
      unit === "fcfa" ? `${numberFormat.format(value)} FCFA` : `${numberFormat.format(value)} commande${value > 1 ? "s" : ""}`,
    formatTick: (value: number) => (unit === "fcfa" ? compactFormat.format(value) : numberFormat.format(value)),
    formatLabel: (label: string) => (bucket === "week" ? `Semaine du ${dayFormat.format(date(label))}` : dayFormat.format(date(label))),
    formatAxisLabel: (label: string) => shortDayFormat.format(date(label)),
  };
}

const width = 640;
const height = 220;
const margin = { top: 12, right: 12, bottom: 28, left: 44 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

/** Graduation « propre » (1, 2, 5 × 10ⁿ) avec 4 intervalles au plus. */
function niceMax(max: number) {
  if (max <= 0) return 4;
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power;
  return Math.max(step * 4, step * Math.ceil(max / step));
}

/**
 * Série dans le temps : courbe (commandes) ou colonnes (argent). Une seule série, donc pas de légende :
 * le titre de la carte la nomme. Info-bulle au survol et au clavier ; tableau des valeurs en dessous.
 */
export function TimeSeriesChart({ kind, points, measure, unit, bucket }: ChartProps) {
  const { format, formatTick, formatLabel, formatAxisLabel } = formatters(unit, bucket);
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const max = useMemo(() => niceMax(Math.max(0, ...points.map((point) => point.value))), [points]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio));
  const band = plotWidth / Math.max(points.length, 1);
  const x = (index: number) => margin.left + band * index + band / 2;
  const y = (value: number) => margin.top + plotHeight - (Math.max(value, 0) / max) * plotHeight;
  const labelEvery = Math.ceil(points.length / 6);
  const barWidth = Math.min(24, band * 0.6);

  const linePath = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const areaPath = points.length ? `${linePath} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : "";

  function pick(clientX: number) {
    const svg = svgRef.current;
    if (!svg || !points.length) return;
    const box = svg.getBoundingClientRect();
    const position = ((clientX - box.left) / box.width) * width - margin.left;
    setActive(Math.min(points.length - 1, Math.max(0, Math.floor(position / band))));
  }

  const activePoint = active === null ? null : points[active];
  const tooltipLeft = active === null ? 0 : (x(active) / width) * 100;

  return (
    <figure className="ts-chart">
      <div className="ts-chart-frame" onPointerLeave={() => setActive(null)}>
        <svg
          aria-labelledby={titleId}
          onPointerDown={(event) => pick(event.clientX)}
          onPointerMove={(event) => pick(event.clientX)}
          ref={svgRef}
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <title id={titleId}>{`${measure} : ${points.length} valeurs, détail dans le tableau ci-dessous.`}</title>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="ts-grid" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} />
              <text className="ts-tick" textAnchor="end" x={margin.left - 8} y={y(tick) + 4}>
                {formatTick(tick)}
              </text>
            </g>
          ))}
          {points.map((point, index) =>
            index % labelEvery === 0 || index === points.length - 1 ? (
              <text className="ts-tick" key={point.label} textAnchor="middle" x={x(index)} y={height - 8}>
                {formatAxisLabel(point.label)}
              </text>
            ) : null,
          )}
          {active !== null && kind === "line" && <line className="ts-crosshair" x1={x(active)} x2={x(active)} y1={margin.top} y2={margin.top + plotHeight} />}
          {kind === "line" ? (
            <>
              <path className="ts-area" d={areaPath} />
              <path className="ts-line" d={linePath} />
              {activePoint && active !== null && <circle className="ts-dot" cx={x(active)} cy={y(activePoint.value)} r={5} />}
            </>
          ) : (
            points.map((point, index) => {
              const top = y(point.value);
              const barHeight = margin.top + plotHeight - top;
              const radius = Math.min(4, barHeight, barWidth / 2);
              const left = x(index) - barWidth / 2;
              const bottom = margin.top + plotHeight;
              // Bout arrondi de 4 px côté valeur, base droite sur l'axe.
              const d = barHeight <= 0 ? "" : `M${left},${bottom} V${top + radius} Q${left},${top} ${left + radius},${top} H${left + barWidth - radius} Q${left + barWidth},${top} ${left + barWidth},${top + radius} V${bottom} Z`;
              return <path className={`ts-bar${active === index ? " is-active" : ""}`} d={d} key={point.label} />;
            })
          )}
          {/* Zones de survol et de focus : toute la largeur de l'intervalle, plus large que la marque. */}
          {points.map((point, index) => (
            <rect
              aria-label={`${formatLabel(point.label)} : ${format(point.value)}`}
              className="ts-hit"
              height={plotHeight}
              key={point.label}
              onBlur={() => setActive(null)}
              onFocus={() => setActive(index)}
              role="img"
              tabIndex={0}
              width={band}
              x={margin.left + band * index}
              y={margin.top}
            />
          ))}
        </svg>
        {activePoint && (
          <div className="ts-tooltip" role="status" style={{ left: `${tooltipLeft}%` }}>
            <strong>{format(activePoint.value)}</strong>
            <span>{formatLabel(activePoint.label)}</span>
          </div>
        )}
      </div>
      <details className="ts-table">
        <summary>Voir les chiffres en tableau</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Période</th>
              <th scope="col">{measure}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}>
                <th scope="row">{formatLabel(point.label)}</th>
                <td>{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
