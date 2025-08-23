
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { Button } from "@/components/ui/button";

export default function Home() {
    return (
        <Providers>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Navbar />
                <div className="max-w-4xl mx-auto p-6">
                    <header className="text-center mb-12">
                        📞
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            AI Tool Calling
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            AI-Powered Assistant with Tool Calling

                        </p>
                    </header>

                    <main className="space-y-8">

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center min-h-50">
                            <h2>
                                Get to know
                            </h2>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white ">
                                Weather,
                                F1Matches,
                                StockPrice

                            </p>
                            <p>
                                better with AI.
                            </p>
                            <Button className="my-4"
                            >
                                <Link
                                    href='/chat'
                                >

                                    Go to Chat
                                </Link>
                            </Button>
                        </div>
                    </main>


                </div>
            </div>
        </Providers>
    );
}
 
