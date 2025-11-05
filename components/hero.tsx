/**
 * Hero component - Brief introduction section
 */
export function Hero() {
  return (
    <section className="w-full py-8 border-b">
      <div className="container">
        <div className="flex flex-col items-start space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            FIX Protocol Analyzer
          </h1>
          <p className="max-w-[700px] text-lg text-muted-foreground">
            Parse, analyze, and track FIX 4.4 protocol messages in real-time.
            Ingest messages, view aggregated orders, inspect individual messages,
            and explore detailed field breakdowns.
          </p>
        </div>
      </div>
    </section>
  );
}
