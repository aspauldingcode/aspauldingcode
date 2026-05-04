export default function ProjectsLoading() {
  return (
    <div className="min-h-screen bg-base00 text-base05 flex flex-col">
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-16 sm:pt-32 pb-8 sm:pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-y-2 gap-x-3 sm:gap-y-3 sm:gap-x-5 lg:gap-x-6 lg:gap-y-4 xl:gap-x-8 xl:gap-y-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] w-full rounded-3xl border border-base05/10 bg-base01/70 overflow-hidden">
              <div
                className="h-full w-full animate-shimmer"
                style={{
                  backgroundSize: '200% 100%',
                  backgroundImage: 'linear-gradient(to right, rgba(56,56,56,0.9), rgba(40,40,40,0.8), rgba(56,56,56,0.9))',
                }}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
