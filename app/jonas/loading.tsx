export default function Loading() {
  return (
    <div className="fixed inset-0 flex bg-[#f8f8f5]" aria-busy="true" aria-label="A abrir o Jonas">
      <div className="hidden w-[300px] shrink-0 space-y-3 border-r border-[#e6e9e0] bg-[#f2f4ee] p-3 lg:block">
        <div className="h-11 animate-pulse rounded-full bg-[#dfe6da]" />
        <div className="h-10 animate-pulse rounded-full bg-[#e8ece2]" />
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-[#e8ece2]" />)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 border-b border-[#eceee7]" />
        <div className="mx-auto w-full max-w-[760px] flex-1 space-y-4 px-6 py-10">
          <div className="size-11 animate-pulse rounded-full bg-[#e8ece2]" />
          <div className="h-8 w-3/4 animate-pulse rounded-xl bg-[#e8ece2]" />
          <div className="h-5 w-1/2 animate-pulse rounded-xl bg-[#eceee7]" />
        </div>
      </div>
    </div>
  )
}
