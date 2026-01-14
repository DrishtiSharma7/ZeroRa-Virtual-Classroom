import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white mb-4">
          Zerora Virtual classroom
        </h1>
        <Link
          href="/login"
          className="inline-block px-6 py-2 rounded-lg bg-blue-600 text-white"
        >
          Go to Login
        </Link>
      </div>
    </main>
  );
}
