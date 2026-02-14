"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/supabase";
import Link from "next/link";

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const category = searchParams.get("category") || "";

  useEffect(() => {
    setLoading(true);
    // Try to get user location for nearby search
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const params = new URLSearchParams({
            lat: pos.coords.latitude.toString(),
            lng: pos.coords.longitude.toString(),
            radius: "50",
            ...(category ? { category } : {}),
            ...(search ? { q: search } : {}),
          });
          apiFetch("listings?" + params.toString()).then((data) => {
            if (Array.isArray(data)) setListings(data);
            setLoading(false);
          });
        },
        () => {
          // Fallback: load all listings
          const params = new URLSearchParams({
            ...(category ? { category } : {}),
            ...(search ? { q: search } : {}),
          });
          apiFetch("listings?" + params.toString()).then((data) => {
            if (Array.isArray(data)) setListings(data);
            setLoading(false);
          });
        }
      );
    } else {
      apiFetch("listings").then((data) => {
        if (Array.isArray(data)) setListings(data);
        setLoading(false);
      });
    }
  }, [category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    apiFetch("listings?q=" + encodeURIComponent(search)).then((data) => {
      if (Array.isArray(data)) setListings(data);
      setLoading(false);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for items..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" />
        <button type="submit" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700">
          Search
        </button>
      </form>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {category ? category.replace("-", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "All Listings"}
        </h1>
        <span className="text-gray-500">{listings.length} results</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-white rounded-xl h-72 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No listings found. Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map((listing: any) => (
            <Link key={listing.id} href={"/listing/" + listing.id}
              className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition border border-gray-100">
              <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                {(listing.listing_photos?.[0]?.url || listing.primary_photo) ? (
                  <img src={listing.listing_photos?.[0]?.url || listing.primary_photo} alt={listing.title} className="w-full h-full object-cover" />
                ) : "No Photo"}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                <p className="text-brand-600 font-bold mt-1">
                  {"$" + (listing.price_per_day || 0).toFixed(2)}/day
                </p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <span>{listing.city || listing.location || "Nearby"}</span>
                  {listing.distance_km && (
                    <span className="ml-2">{listing.distance_km.toFixed(1)} km away</span>
                  )}
                  {listing.avg_rating > 0 && (
                    <span className="ml-auto">{"\u2B50 " + Number(listing.avg_rating).toFixed(1)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
