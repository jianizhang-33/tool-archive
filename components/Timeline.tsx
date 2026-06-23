"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Tool = {
  id: string;
  slug: string;
  name: string;
  year: number;
  group_name?: string;
  color?: string;
  description?: string;
  img_url?: string;
};

const LEGEND = [
  { name: "Wool", color: "#5A8DDE" },
  { name: "Clay", color: "#E56B63" },
  { name: "Willow", color: "#E9A04B" },
  { name: "Reed", color: "#58B96B" },
  { name: "Straw", color: "#E8C84A" },
  { name: "Pine", color: "#6747D8" },
];

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
}

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

export default function Timeline({ tools }: { tools: Tool[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const zoomRef = useRef(1);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);
  const didInitialCenterRef = useRef(false);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  const sorted = useMemo(
    () => [...tools].sort((a, b) => a.year - b.year),
    [tools]
  );

  const minYear = useMemo(
    () => Math.min(...sorted.map((t) => t.year)),
    [sorted]
  );
  const maxYear = useMemo(
    () => Math.max(...sorted.map((t) => t.year)),
    [sorted]
  );

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
    ? Math.max(viewport.height * 0.18, 140)
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
    if (sorted.length === 0) return [];
    const steps = isMobile ? 5 : 7;

    return Array.from({ length: steps + 1 }, (_, i) => {
      const rawYear = minYear + ((maxYear - minYear) * i) / steps;
      const year = Math.round(rawYear / 1000) * 1000;
      return {
        year,
        x: getX(rawYear),
      };
    }).filter((tick, index, arr) => {
      return arr.findIndex((t) => t.year === tick.year) === index;
    });
  }, [isMobile, minYear, maxYear, sorted.length]);

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
                top: timelineY + 25,
                width: 90,
              }}
            >
              <div className="text-sm font-medium text-slate-500">
                {formatYear(tick.year)}
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

            return (
              <div
                key={tool.id}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: timelineY,
                  transform: "translateX(-50%)",
                  width: cardWidth,
                }}
              >
                <div
                  className="absolute z-30 rounded-full border-[5px] bg-white shadow-sm"
                  style={{
                    left: "50%",
                    top: -13,
                    width: 26,
                    height: 26,
                    transform: "translateX(-50%)",
                    borderColor: accent,
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
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    width: cardWidth,
                    top: topSide ? -(connectorLength + 330) : connectorLength + 42,
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

      <div className="fixed bottom-5 left-5 z-50 rounded-2xl bg-white/20 p-4 shadow-lg backdrop-blur-md ring-1 ring-black/5">
        <div className="mb-3 text-sm font-bold tracking-wide text-slate-800">
          Legend
        </div>
        <div className="space-y-2">
          {LEGEND.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className="h-3 w-8 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-700">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}