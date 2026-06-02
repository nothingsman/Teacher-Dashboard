import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-black text-[#1A237E]">404</h1>
        <p className="mt-4 text-lg text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block bg-[#1A237E] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#283593] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
