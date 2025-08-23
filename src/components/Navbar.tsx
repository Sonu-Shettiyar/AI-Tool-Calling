"use client";

import Link from "next/link";
 

export default function Navbar() {
 
  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
           
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
               📞
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                AI Tool Calling
              </span>
            </Link>
          </div>

          
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Home
            </Link>
           
          </div>

     
         
        </div>
      </div>
    </nav>
  );
}
