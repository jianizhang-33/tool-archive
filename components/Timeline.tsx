"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatYear,
  getMaterialOptions,
  toolMatchesQuery,
  ToolRecord,
} from "@/lib/tool-utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(t1: Touch, t2: Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function getMidpoint(t1: Touch, t2: Touch) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

function niceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;

  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);

  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * Math.pow(10, exponent);
}

function buildTicks(minYear: number, maxYear: number, desiredCount: number) {
  const range = Math.max(maxYear - minYear, 1);
  const step = niceStep(range / desiredCount);
  const start = Math.ceil(minYear / step) * step;

  const ticks: number[] = [];
  for (let y = start; y <= maxYear; y += step) {
    ticks.push(Math.round(y));
  }

  if (minYear < 0 && maxYear > 0 && !ticks.includes(0)) {
    ticks.push(0);
  }

  return Array.from(new Set(ticks)).sort((a, b) => a - b);
}

function formatShortYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
}

export default function Timeline({ tools }: { tools: ToolRecord[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const zoomRef = useRef(1);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);
  const didInitialCenterRef = useRef(false);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  const [search, setSearch] = useState("");
  const [activeMaterial, setActiveMaterial] = useState("All");

  const sorted = useMemo(
    () => [...tools].sort((a, b) => a.year - b.year),
    [tools]
  );

  const materials = useMemo(() => getMaterialOptions(sorted), [sorted]);

  const filteredForFocus = useMemo(() => {
    return sorted.filter((tool) => {
      const materialOK =
        activeMaterial === "All" || tool.group_name === activeMaterial;
      const searchOK = !search.trim() || toolMatchesQuery(tool, search);
      return materialOK && searchOK;
    });
  }, [sorted, search, activeMaterial]);

  const focusTool = useMemo(() => {
    if (filteredForFocus.length === 0) return null;
    if (search.trim()) return filteredForFocus[0];
    if (activeMaterial !== "All") return filteredForFocus[0];
    return null;
  }, [filteredForFocus, search, activeMaterial]);

  const minYear = useMemo(() => {
    if (sorted.length === 0) return 0;
    return Math.min(...sorted.map((t) => t.year));
  }, [sorted]);

  const maxYear = useMemo(() => {
    if (sorted.length === 0) return 0;
    return Math.max(...sorted.map((t) => t.year));
  }, [sorted]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const update = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = viewport.width > 0 ? viewport.width < 768 : false;

  const topPad = isMobile
    ? Math.max(viewport.height * 0.18, 150)
    : Math.max(viewport.height * 0.16, 130);

  const bottomPad = isMobile
    ? Math.max(viewport.height * 0.28, 240)
    : Math.max(viewport.height * 0.2, 180);

  const stageHeight = Math.max(
    (viewport.height || 800) * (isMobile ? 3.2 : 2.8),
    topPad + bottomPad + 880
  );

  const timelineY = Math.round(
    topPad + (stageHeight - topPad - bottomPad) * (isMobile ? 0.42 : 0.48)
  );

  const stageWidth = Math.max(
    isMobile ? 1900 : 2600,
    sorted.length * (isMobile ? 280 : 340)
  );

  const cardWidth = isMobile ? 230 : 300;
  const connectorLength = isMobile ? 140 : 170;

  const minX = 8;
  const maxX = 92;
  const spread = maxX - minX;

  function getX(year: number) {
    if (minYear === maxYear) return 50;
    const raw = (year - minYear) / (maxYear - minYear);
    return minX + raw * spread;
  }

  const ticks = useMemo(() => {
    const desiredCount = isMobile ? 4 : 6;
    return buildTicks(minYear, maxYear, desiredCount).map((year) => ({
      year,
      x: getX(year),
    }));
  }, [isMobile, minYear, maxYear]);

  function applyZoom(nextZoom: number, clientX: number, clientY: number) {
    const container = scrollRef.current;
    if (!container) return;

    const clampedZoom = clamp(nextZoom, 0.7, 1.5);
    const prevZoom = zoomRef.current;
    if (clampedZoom === prevZoom) return;

    const rect = container.getBoundingClientRect();
    const anchorX = clientX - rect.left;
    const anchorY = clientY - rect.top;
    const ratio = clampedZoom / prevZoom;

    container.scrollLeft = Math.max(
      0,
      (container.scrollLeft + anchorX) * ratio - anchorX
    );
    container.scrollTop = Math.max(
      0,
      (container.scrollTop + anchorY) * ratio - anchorY
    );

    zoomRef.current = clampedZoom;
    setZoom(clampedZoom);
  }

  function centerOnFocusTool() {
    const container = scrollRef.current;
    if (!container || !focusTool || !viewport.width || !viewport.height) return;

    const idx = sorted.findIndex((tool) => tool.id === focusTool.id);
    const toolX = getX(focusTool.year) / 100;
    const scaledWidth = stageWidth * zoomRef.current;
    const scaledHeight = stageHeight * zoomRef.current;

    const isTopSide = idx % 2 === 0;
    const cardYOffset = isTopSide
      ? (timelineY - (connectorLength + 330)) * zoomRef.current
      : (timelineY + connectorLength + 42) * zoomRef.current;

    const targetScrollLeft = clamp(
      toolX * scaledWidth - container.clientWidth / 2,
      0,
      Math.max(scaledWidth - container.clientWidth, 0)
    );

    const targetScrollTop = clamp(
      cardYOffset - container.clientHeight / 2 + 100,
      0,
      Math.max(scaledHeight - container.clientHeight, 0)
    );

    container.scrollLeft = targetScrollLeft;
    container.scrollTop = targetScrollTop;
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !viewport.width || !viewport.height) return;

    const timer = window.setTimeout(() => {
      if (didInitialCenterRef.current) return;

      container.scrollLeft = Math.max(
        (container.scrollWidth - container.clientWidth) / 2,
        0
      );
      container.scrollTop = Math.max(
        timelineY * zoomRef.current - container.clientHeight * 0.48,
        0
      );
      didInitialCenterRef.current = true;
    }, 30);

    return () => window.clearTimeout(timer);
  }, [viewport.width, viewport.height, timelineY, stageWidth, stageHeight]);

  useEffect(() => {
    centerOnFocusTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeMaterial, viewport.width, viewport.height]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      applyZoom(
        zoomRef.current - event.deltaY * 0.0015,
        event.clientX,
        event.clientY
      );
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchStartDistanceRef.current = getDistance(
          event.touches[0],
          event.touches[1]
        );
        pinchStartZoomRef.current = zoomRef.current;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchStartDistanceRef.current) {
        event.preventDefault();

        const currentDistance = getDistance(event.touches[0], event.touches[1]);
        const midpoint = getMidpoint(event.touches[0], event.touches[1]);
        const nextZoom =
          pinchStartZoomRef.current *
          (currentDistance / pinchStartDistanceRef.current);

        applyZoom(nextZoom, midpoint.x, midpoint.y);
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        pinchStartDistanceRef.current = null;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const searchCount = search.trim()
    ? sorted.filter((tool) => toolMatchesQuery(tool, search)).length
    : sorted.length;

  return (
    <div
      ref={scrollRef}
      className="w-full min-h-screen overflow-x-auto overflow-y-auto"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
        backgroundColor: "#fafafa",
        touchAction: "pan-x pan-y",
      }}
    >
      {/* fixed left-top control card */}
      <div className="fixed left-3 top-3 z-50 w-[calc(100vw-1.5rem)] max-w-[520px] rounded-3xl bg-white/20 p-4 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:left-5 md:top-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
          Tool Archive
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Interactive timeline archive
        </p>

        <div className="mt-4 space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools, descriptions, years..."
            className="w-full rounded-full border border-white/40 bg-white/75 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400"
          />

          <div className="flex flex-wrap gap-2">
            {materials.map((item) => {
              const isActive = activeMaterial === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveMaterial(item.name)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-white/60 text-slate-700 hover:bg-white/85"
                  }`}
                  style={
                    isActive && item.color
                      ? { boxShadow: `0 0 0 2px ${item.color} inset` }
                      : undefined
                  }
                >
                  {item.name}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <span>{searchCount} tools matched</span>
            <div className="flex items-center gap-2">
              <span>Ctrl + wheel on desktop</span>
              <span>·</span>
              <span>pinch on mobile</span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          width: stageWidth * zoom,
          height: stageHeight * zoom,
          position: "relative",
        }}
      >
        <div
          className="relative"
          style={{
            width: stageWidth,
            height: stageHeight,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          {/* year ticks */}
          {ticks.map((tick) => (
            <div
              key={`${tick.year}-${tick.x}`}
              className="pointer-events-none absolute z-20 -translate-x-1/2 text-center"
              style={{
                left: `${tick.x}%`,
                top: timelineY - (isMobile ? 82 : 96),
                width: isMobile ? 96 : 110,
              }}
            >
              <div className="text-sm font-medium whitespace-nowrap text-slate-500">
                {formatShortYear(tick.year)}
              </div>
            </div>
          ))}

          {/* main line */}
          <div
            className="absolute left-[120px] right-[120px] rounded-full bg-slate-300/90"
            style={{
              top: timelineY,
              height: isMobile ? 10 : 12,
            }}
          />

          {sorted.map((tool, index) => {
            const topSide = index % 2 === 0;
            const x = getX(tool.year);
            const accent = tool.color || "#E56B63";

            const searchMatch = !search.trim() || toolMatchesQuery(tool, search);
            const materialMatch =
              activeMaterial === "All" || tool.group_name === activeMaterial;

            const isFocused =
              focusTool?.id === tool.id && (search.trim() || activeMaterial !== "All");

            const faded =
              (!search.trim() || searchMatch ? 1 : 0.26) *
              (activeMaterial === "All" || materialMatch ? 1 : 0.26);

            return (
              <div
                key={tool.id}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: timelineY,
                  transform: "translateX(-50%)",
                  width: cardWidth,
                  opacity: faded,
                  transition: "opacity 180ms ease, transform 180ms ease",
                }}
              >
                <div
                  className={`absolute z-30 rounded-full border-[5px] bg-white shadow-sm ${
                    isFocused ? "shadow-lg" : ""
                  }`}
                  style={{
                    left: "50%",
                    top: -13,
                    width: 26,
                    height: 26,
                    transform: "translateX(-50%)",
                    borderColor: accent,
                    boxShadow: isFocused ? `0 0 0 8px ${accent}22` : undefined,
                  }}
                />

                <div
                  className="absolute left-1/2 border-l border-dashed border-slate-500/80"
                  style={{
                    transform: "translateX(-50%)",
                    top: topSide ? -(connectorLength - 2) : 26,
                    height: connectorLength,
                  }}
                />

                <Link
                  href={`/tool/${tool.slug}`}
                  className={`absolute left-1/2 -translate-x-1/2 ${isFocused ? "scale-[1.01]" : ""}`}
                  style={{
                    width: cardWidth,
                    top: topSide ? -(connectorLength + 330) : connectorLength + 42,
                    transition: "transform 180ms ease",
                  }}
                >
                  <div className="group text-center">
                    {topSide ? (
                      <>
                        <div className="mb-4">
                          <h2 className="text-[22px] font-semibold tracking-wide text-slate-800">
                            {tool.name}
                          </h2>
                          <p className="mt-1 text-lg text-slate-500">
                            {formatYear(tool.year)}
                          </p>
                          <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                            {tool.description || ""}
                          </p>
                        </div>

                        <div className="mx-auto flex h-[150px] w-[220px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition duration-200 group-hover:scale-[1.03] group-hover:shadow-lg">
                          <img
                            src={tool.img_url || "/placeholder.png"}
                            alt={tool.name}
                            className="h-full w-full object-contain p-3"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto flex h-[150px] w-[220px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition duration-200 group-hover:scale-[1.03] group-hover:shadow-lg">
                          <img
                            src={tool.img_url || "/placeholder.png"}
                            alt={tool.name}
                            className="h-full w-full object-contain p-3"
                          />
                        </div>

                        <h2 className="mt-5 text-[22px] font-semibold tracking-wide text-slate-800">
                          {tool.name}
                        </h2>
                        <p className="mt-1 text-lg text-slate-500">
                          {formatYear(tool.year)}
                        </p>
                        <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                          {tool.description || ""}
                        </p>
                      </>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* fixed legend */}
      <div className="fixed bottom-3 left-3 z-50 rounded-2xl bg-white/20 p-4 shadow-lg backdrop-blur-md ring-1 ring-black/5 md:bottom-5 md:left-5">
        <div className="mb-3 text-sm font-bold tracking-wide text-slate-800">
          Legend
        </div>
        <div className="space-y-2">
          {materials
            .filter((item) => item.name !== "All")
            .map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className="h-3 w-8 rounded-sm"
                  style={{ backgroundColor: item.color || "#64748b" }}
                />
                <span className="text-sm text-slate-700">{item.name}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}