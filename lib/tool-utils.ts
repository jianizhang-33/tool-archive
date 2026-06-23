export type ToolRecord = {
  id: string;
  slug: string;
  name: string;
  year: number;
  group_name?: string | null;
  color?: string | null;
  description?: string | null;
  img_url?: string | null;
  drawing_url?: string | null;
  video_url?: string | null;
  video_urls?: unknown;
};

export function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
}

export function toEmbedUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.includes("youtube.com/embed/")) return trimmed;

  if (trimmed.includes("watch?v=")) {
    return trimmed.replace("watch?v=", "embed/");
  }

  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  return trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeVideoUrls(
  tool: Pick<ToolRecord, "video_url" | "video_urls">
) {
  const raw = tool.video_urls;

  if (Array.isArray(raw)) {
    return raw
      .filter(isNonEmptyString)
      .map((url) => toEmbedUrl(url))
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return isNonEmptyString(tool.video_url) ? [toEmbedUrl(tool.video_url)] : [];

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(isNonEmptyString)
            .map((url) => toEmbedUrl(url))
            .filter(Boolean);
        }
      } catch {
        // fall through
      }
    }

    return [toEmbedUrl(trimmed)].filter(Boolean);
  }

  if (isNonEmptyString(tool.video_url)) {
    return [toEmbedUrl(tool.video_url)].filter(Boolean);
  }

  return [];
}

export function toolMatchesQuery(tool: ToolRecord, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const haystack = [
    tool.name ?? "",
    tool.slug ?? "",
    tool.group_name ?? "",
    tool.description ?? "",
    String(tool.year ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function getMaterialOptions(tools: ToolRecord[]) {
  const seen = new Map<string, string>();

  for (const tool of tools) {
    const name = tool.group_name?.trim();
    if (!name) continue;
    if (!seen.has(name)) {
      seen.set(name, tool.color || "#64748b");
    }
  }

  return [
    { name: "All", color: null as string | null },
    ...Array.from(seen.entries()).map(([name, color]) => ({ name, color })),
  ];
}