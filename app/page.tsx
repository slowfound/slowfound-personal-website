import { AsciiField } from "@/components/ascii-field"
import { MorphCard } from "@/components/morph-card"

export default function Page() {
  return (
    <main className="relative isolate flex h-svh touch-none items-center justify-center overflow-hidden p-4">
      <AsciiField className="absolute inset-0 -z-10 size-full text-foreground" />
      <MorphCard />
    </main>
  )
}
