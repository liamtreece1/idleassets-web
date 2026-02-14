'use client';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/supabase";
import Link from "next/link";

function BrowseContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const category = searchParams.get("category") || "";

  useEffect(() => {
    setLoading(true);
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
    const params = new URLSearchParams({ ...(search ? { q: search } : {}) });
    apiFetch("listings?" + params.toString()).then((data) => {
      if (Array.isArray(data)) setListings(data);
      setLoading(false);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-blue-600 text-lg">IdleAssets</Link>
        <Link href="/list" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">List Item</Link>
      </nav>
      <div className="max-w-5xl mx-auto p-4">
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="flex-1 border rounded-lg px-4 py-2" />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">Search</button>
        </form>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500 text-lg">No items found</p><Link href="/browse" className="text-blue-600 mt-2 inline-block">Clear filters</Link></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((item: any) => (
              <Link key={item.id} href={`/listing/${item.id}`} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
                <div className="aspect-square bg-gray-200">
                  {item.listing_photos?.[0]?.photo_url && <img src={item.listing_photos[0].photo_url} alt={item.title} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{item.title}</h3>
                  <p className="text-blue-600 font-bold">${item.price_per_day}/day</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <span>\u2605 {item.avg_rating?.toFixed(1) || 'New'}</span>
                    <span>\u00B7 {item.total_rentals || 0} rentals</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <BrowseContent />
    </Suspense>
  );
}
