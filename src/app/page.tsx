
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { Button } from "@/components/ui/button";
import ShowLoginToast from "@/components/showLoginToast";

export default function Home() {
    return (
        <Providers>
           <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
  <Navbar />

  <div className="flex-1 flex flex-col items-center justify-center px-6">
    <header className="text-center mb-12">
      <div className="text-5xl mb-4">📞</div>
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        AI Tool Calling
      </h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        Experience an AI-powered assistant that can fetch real-time{" "}
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          Weather
        </span>
        ,{" "}
        <span className="font-semibold text-red-600 dark:text-red-400">
          F1 Matches
        </span>{" "}
        &{" "}
        <span className="font-semibold text-green-600 dark:text-green-400">
          Stock Prices
        </span>{" "}
        — all in one place.
      </p>
    </header>

    <main className="w-full max-w-3xl">
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center transition hover:shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Get to Know Your World Better
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Let AI assist you in making smarter decisions with up-to-date insights.
        </p>

        <Button asChild className="px-6 py-3 text-lg rounded-xl shadow-md">
          <Link href="/chat">🚀 Go to Chat</Link>
        </Button>
      </section>
    </main>
  </div>
</div>

            <ShowLoginToast />

        </Providers>
    );
}
 
