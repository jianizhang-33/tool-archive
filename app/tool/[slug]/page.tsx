import { supabase } from "@/lib/supabase";
import { formatYear, normalizeVideoUrls, ToolRecord } from "@/lib/tool-utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;

  const { data: tool, error } = await supabase
    .from("tools")
    .select("*")
    .eq("slug", slug)
    .single<ToolRecord>();

  if (error || !tool) notFound();

  const videos = normalizeVideoUrls(tool);

  return (
    <main
      className="min-h-screen bg-[#fafafa]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-md ring-1 ring-black/5 transition hover:bg-white/25"
        >
          ← Back to timeline
        </Link>

        <section className="mt-6 rounded-[32px] bg-white/20 p-5 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
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
        </section>

        <section className="mt-8 rounded-[32px] bg-white/25 p-5 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
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

        <section className="mt-8 rounded-[32px] bg-white/25 p-5 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
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

        <section className="mt-8 rounded-[32px] bg-white/25 p-5 shadow-xl backdrop-blur-md ring-1 ring-black/5 md:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">
            Using Videos{videos.length ? ` (${videos.length})` : ""}
          </h2>
          <p className="mt-2 text-slate-600">
            One tool can have one or multiple videos.
          </p>

          {videos.length > 0 ? (
            <div className={`mt-6 grid gap-5 ${videos.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {videos.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="overflow-hidden rounded-[24px] bg-black shadow-lg ring-1 ring-black/5"
                >
                  <div className="bg-black px-4 py-2 text-sm text-white/80">
                    Video {index + 1}
                  </div>
                  <iframe
                    src={src}
                    className="aspect-video w-full"
                    title={`${tool.name} video ${index + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] bg-white/70 p-6 text-slate-600 ring-1 ring-black/5">
              No video uploaded yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}