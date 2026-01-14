import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[url('/bg-login.png')] bg-cover bg-center flex items-center justify-center">
      <div className="bg-black/60 rounded-2xl px-8 py-10 w-full max-w-xl text-center text-white">
        <h1 className="text-3xl font-semibold mb-6">
          Zerora Virtual classroom
        </h1>
        <p className="mb-8 text-gray-200">
          Join as a teacher or student and start your virtual class.
        </p>
        <a
          href="/login"
          className="inline-block rounded-xl bg-white text-gray-900 px-6 py-3 font-medium hover:bg-gray-100 transition"
        >
          Go to Login
        </a>
      </div>
    </main>
  );
}
