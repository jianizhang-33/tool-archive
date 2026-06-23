import { supabase } from "@/lib/supabase";
import Timeline from "@/components/Timeline";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: tools, error } = await supabase.from("tools").select("*");

  if (error) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="text-red-600">Failed to load tools: {error.message}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="fixed left-6 top-6 z-50 rounded-2xl bg-white/20 px-5 py-3 shadow-lg backdrop-blur-md ring-1 ring-black/5">
        <h1 className="text-4xl font-bold text-slate-800">Tool Archive</h1>
      </div>

      <Timeline tools={tools ?? []} />
    </main>
  );
}