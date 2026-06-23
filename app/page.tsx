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
      <Timeline tools={tools ?? []} />
    </main>
  );
}