import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "IdleAssets - Rent Anything Nearby",
  description: "The peer-to-peer rental marketplace. Airbnb for everything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <a href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-brand-600">Idle</span>
                <span className="text-2xl font-bold text-gray-900">Assets</span>
              </a>
              <div className="hidden md:flex items-center space-x-6">
                <a href="/browse" className="text-gray-600 hover:text-gray-900">Browse</a>
                <a href="/list" className="text-gray-600 hover:text-gray-900">List an Item</a>
                <a href="/activity" className="text-gray-600 hover:text-gray-900">Activity</a>
                <a href="/messages" className="text-gray-600 hover:text-gray-900">Messages</a>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/auth" className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition">
                  Sign In
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
