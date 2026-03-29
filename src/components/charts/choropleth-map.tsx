"use client";

import { memo, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { CHART_PALETTE } from "@/lib/chart-config";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface ChoroplethMapProps {
  data: Map<string, number> | Record<string, number>;
  height?: number;
  colorScale?: string[];
}

function interpolateColor(colors: string[], t: number): string {
  if (t <= 0) return colors[0];
  if (t >= 1) return colors[colors.length - 1];
  const idx = t * (colors.length - 1);
  const lo = Math.floor(idx);
  return colors[Math.min(lo, colors.length - 1)];
}

export const ChoroplethMap = memo(function ChoroplethMap({
  data: rawData,
  height = 400,
  colorScale = ["#e0f2fe", "#0284c7", "#0c4a6e"],
}: ChoroplethMapProps) {
  const [tooltip, setTooltip] = useState("");
  const [geoError, setGeoError] = useState(false);
  const dataMap = useMemo(() => {
    if (rawData instanceof Map) return rawData;
    return new Map(Object.entries(rawData));
  }, [rawData]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const v of dataMap.values()) if (v > m) m = v;
    return m || 1;
  }, [dataMap]);

  if (geoError) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        Não foi possível carregar o mapa. Verifique sua conexão.
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative w-full">
      <ComposableMap
        projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL} parseGeographies={(geos) => geos} onError={() => setGeoError(true)}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isoA3 = geo.properties?.ISO_A3 || geo.id;
                const isoA2 = geo.properties?.ISO_A2;
                const val = dataMap.get(isoA3) ?? dataMap.get(isoA2) ?? dataMap.get(geo.properties?.name) ?? 0;
                const t = val / maxVal;
                const fill = val > 0 ? interpolateColor(colorScale, t) : "#f1f5f9";
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#e2e8f0"
                    strokeWidth={0.5}
                    onMouseEnter={() => {
                      setTooltip(`${geo.properties?.name || isoA3}: ${val}`);
                    }}
                    onMouseLeave={() => setTooltip("")}
                    style={{
                      hover: { fill: CHART_PALETTE[0], outline: "none" },
                      pressed: { outline: "none" },
                      default: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tooltip && (
        <div className="absolute top-2 left-2 bg-popover text-popover-foreground border rounded-md px-3 py-1.5 text-xs shadow-md z-10">
          {tooltip}
        </div>
      )}
    </div>
  );
});
