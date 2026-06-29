export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">${{ values.name }}</h1>
        <p className="text-lg text-gray-600 mb-8">${{ values.description }}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="/api/health"
            className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Health Check →</h2>
            <p className="text-sm text-gray-500">Check application status</p>
          </a>
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Next.js Docs →</h2>
            <p className="text-sm text-gray-500">Framework documentation</p>
          </a>
        </div>
      </div>
    </main>
  );
}
