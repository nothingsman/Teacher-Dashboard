export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1A237E] text-white shadow-lg shadow-blue-900/15">
          <span className="text-xl font-black tracking-[0.18em]">KT</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The Teacher Dashboard is installed and can open on your phone, but live school data still needs an internet connection.
        </p>
        <a
          href="/login"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[#1A237E] px-5 text-sm font-semibold text-white transition hover:bg-[#283593]"
        >
          Try again
        </a>
      </div>
    </main>
  );
}
