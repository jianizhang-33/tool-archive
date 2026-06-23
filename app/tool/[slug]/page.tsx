import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
}

function toEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url;
  if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
  const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;

  const { data: tool, error } = await supabase
    .from("tools")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !tool) {
    notFound();
  }

  const videoSrc = tool.video_url ? toEmbedUrl(tool.video_url) : "";

  return (
    <main
      className="min-h-screen bg-[#fafafa]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
      }}
    >
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/30 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-md ring-1 ring-black/5 transition hover:bg-white/45"
        >
          ← Back to timeline
        </Link>

        <div className="mt-8 rounded-[32px] bg-white/25 p-6 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {tool.group_name || "Tool"}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
                {tool.name}
              </h1>
              <p className="mt-3 text-lg text-slate-600">
                {formatYear(tool.year)}
              </p>
            </div>

            <div className="max-w-xs rounded-2xl bg-white/50 p-4 shadow-md ring-1 ring-black/5">
              <div className="text-sm font-semibold text-slate-700">Preview</div>
              <img
                src={tool.img_url || "/placeholder.png"}
                alt={tool.name}
                className="mt-3 h-32 w-full rounded-xl object-contain bg-white"
              />
            </div>
          </div>
        </div>

        {/* Drawing */}
        <section className="mt-8 rounded-[32px] bg-white/55 p-5 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Drawing</h2>
          <p className="mt-2 text-slate-600">
            Technical drawing / logic drawing for the tool.
          </p>

          <div className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-lg ring-1 ring-black/5">
            <img
              src={tool.drawing_url || "/placeholder.png"}
              alt={`${tool.name} drawing`}
              className="h-auto w-full object-contain"
            />
          </div>
        </section>

        {/* Information */}
        <section className="mt-8 rounded-[32px] bg-white/55 p-5 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Information</h2>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-[24px] bg-white/70 p-5 ring-1 ring-black/5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Description
              </div>
              <p className="mt-3 text-lg leading-relaxed text-slate-700">
                {tool.description || "No description yet."}
              </p>
            </div>

            <div className="rounded-[24px] bg-white/70 p-5 ring-1 ring-black/5">
              <div className="space-y-4 text-slate-700">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Group
                  </div>
                  <div className="mt-1 text-lg">{tool.group_name || "-"}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Year
                  </div>
                  <div className="mt-1 text-lg">{formatYear(tool.year)}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Slug
                  </div>
                  <div className="mt-1 break-all text-lg">{tool.slug}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Video */}
        <section className="mt-8 rounded-[32px] bg-white/55 p-5 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Using Video</h2>
          <p className="mt-2 text-slate-600">
            Demonstration video for how the tool is used.
          </p>

          <div className="mt-6 overflow-hidden rounded-[28px] bg-black shadow-lg ring-1 ring-black/5">
            {videoSrc ? (
              <iframe
                src={videoSrc}
                className="aspect-video w-full"
                title={`${tool.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-white/5 text-slate-300">
                No video uploaded yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}