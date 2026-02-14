"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/supabase";
import Link from "next/link";

const CATEGORIES = [
  { name: "Electronics", slug: "electronics", icon: "💻" },
  { name: "Tools", slug: "tools-equipment", icon: "🔧" },
  { name: "Outdoor", slug: "outdoor-sports", icon: "⛺" },
  { name: "Vehicles", slug: "vehicles-transport", icon: "🚗" },
  { name: "Home", slug: "home-garden", icon: "🏠" },
  { name: "Party", slug: "party-events", icon: "🎉" },
  { name: "Photo/Video", slug: "photography-video", icon: "📷" },
  { name: "Music", slug: "music", icon: "🎵" },
];

export default function Home() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("listings").then((data) => {
      if (Array.isArray(data)) setListings(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-600 to-green-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Rent Anything Nearby</h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100">
            Why buy when you can borrow? Find tools, gear, electronics and more from people in your neighborhood.
          </p>
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              placeholder="What do you need? Try &quot;drone&quot;, &quot;pressure washer&quot;..."
              className="flex-1 px-6 py-4 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Link href="/browse" className="bg-white text-brand-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-green-50 transition">
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Browse Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={"/browse?category=" + cat.slug}
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition border border-gray-100">
              <span className="text-4xl mb-3 block">{cat.icon}</span>
              <span className="font-semibold text-gray-900">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Listings */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Recent Listings</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl h-72 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-500 text-lg mb-4">No listings yet. Be the first!</p>
            <Link href="/list" className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition">
              List Your First Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.slice(0, 8).map((listing: any) => (
              <Link key={listing.id} href={"/listing/" + listing.id}
                className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition border border-gray-100">
                <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                  {listing.listing_photos?.[0]?.url ? (
                    <img src={listing.listing_photos[0].url} alt={listing.title} className="w-full h-full object-cover" />
                  ) : "No Photo"}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                  <p className="text-brand-600 font-bold mt-1">
                    {"$" + (listing.price_per_day || 0).toFixed(2)}/day
                  </p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <span>{listing.city || "Nearby"}</span>
                    {listing.avg_rating > 0 && (
                      <span className="ml-auto">{"⭐ " + listing.avg_rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Find", desc: "Search for items near you. Filter by category, price, and distance." },
              { step: "2", title: "Rent", desc: "Request a rental, pay securely with Stripe. Owner approves and you pick up." },
              { step: "3", title: "Return", desc: "Return the item, leave a review. Security deposit released automatically." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-2xl font-bold text-white mb-2">IdleAssets</p>
          <p>The peer-to-peer rental marketplace. Rent anything from anyone, anywhere.</p>
          <p className="mt-4 text-sm">15% platform fee on rentals. Payments secured by Stripe.</p>
        </div>
      </footer>
    </div>
  );
}
