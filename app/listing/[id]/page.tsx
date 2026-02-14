'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface ListingPhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

interface Owner {
  id: string;
  full_name: string;
  avatar_url: string | null;
  trust_score: number;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  category_id: string;
  price_per_day: number;
  deposit_amount: number;
  condition: string;
  pickup_instructions: string;
  latitude: number;
  longitude: number;
  address_text: string;
  is_available: boolean;
  avg_rating: number;
  total_reviews: number;
  total_rentals: number;
  owner: Owner;
  listing_photos: ListingPhoto[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: { full_name: string; avatar_url: string | null };
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchListing();
    fetchReviews();
  }, [params.id]);

  useEffect(() => {
    if (user && params.id) checkFavorite();
  }, [user, params.id]);

  async function fetchListing() {
    const { data, error } = await supabase
      .from('listings')
      .select(`*, owner:profiles!listings_owner_id_fkey(id, full_name, avatar_url, trust_score), listing_photos(*)`)
      .eq('id', params.id)
      .single();
    if (data) {
      data.listing_photos?.sort((a: ListingPhoto, b: ListingPhoto) => a.display_order - b.display_order);
      setListing(data);
    }
    setLoading(false);
  }

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)`)
      .eq('listing_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setReviews(data);
  }

  async function checkFavorite() {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', params.id)
      .maybeSingle();
    setIsFavorite(!!data);
  }

  async function toggleFavorite() {
    if (!user) { router.push('/auth'); return; }
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', params.id);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: params.id as string });
      setIsFavorite(true);
    }
  }

  function calculateTotal() {
    if (!startDate || !endDate || !listing) return 0;
    const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000));
    return days * listing.price_per_day;
  }

  async function handleRentRequest() {
    if (!user) { router.push('/auth'); return; }
    if (!startDate || !endDate) { alert('Please select dates'); return; }
    const total = calculateTotal();
    const serviceFee = total * 0.15;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api/rentals`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          listing_id: params.id,
          start_date: startDate,
          end_date: endDate,
          total_price: total + serviceFee,
          deposit_amount: listing?.deposit_amount || 0,
        })
      }
    );
    if (res.ok) {
      alert('Rental request sent! The owner will review it.');
      router.push('/activity');
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to send request');
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (!listing) return <div className="min-h-screen flex items-center justify-center"><p>Listing not found</p></div>;

  const photos = listing.listing_photos?.length ? listing.listing_photos : [{ id: '0', photo_url: '/placeholder.jpg', display_order: 0 }];
  const total = calculateTotal();
  const serviceFee = total * 0.15;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">&larr; Back</button>
        <h1 className="font-semibold truncate flex-1">{listing.title}</h1>
        <button onClick={toggleFavorite} className="text-2xl">{isFavorite ? '\u2764\uFE0F' : '\u2661'}</button>
      </nav>

      <div className="max-w-5xl mx-auto p-4 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="relative bg-gray-200 rounded-xl overflow-hidden aspect-[4/3]">
            <img src={photos[currentPhoto]?.photo_url || '/placeholder.jpg'} alt={listing.title} className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <>
                <button onClick={() => setCurrentPhoto(p => Math.max(0, p - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-10 h-10 flex items-center justify-center">&lsaquo;</button>
                <button onClick={() => setCurrentPhoto(p => Math.min(photos.length - 1, p + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-10 h-10 flex items-center justify-center">&rsaquo;</button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_: ListingPhoto, i: number) => (
                    <span key={i} className={`w-2 h-2 rounded-full ${i === currentPhoto ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{listing.condition}</span>
              <span>{listing.total_rentals} rentals</span>
            </div>
            <h2 className="text-2xl font-bold">{listing.title}</h2>
            <p className="text-gray-500 mt-1">{listing.address_text}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-yellow-500">\u2605</span>
              <span className="font-medium">{listing.avg_rating?.toFixed(1) || 'New'}</span>
              <span className="text-gray-400">({listing.total_reviews} reviews)</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
          </div>

          {listing.pickup_instructions && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Pickup Instructions</h3>
              <p className="text-gray-700">{listing.pickup_instructions}</p>
            </div>
          )}

          <div className="border-t pt-6">
            <Link href={`/profile/${listing.owner.id}`} className="flex items-center gap-3 hover:bg-gray-100 p-3 rounded-lg -m-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg overflow-hidden">
                {listing.owner.avatar_url ? <img src={listing.owner.avatar_url} className="w-full h-full object-cover" /> : listing.owner.full_name?.[0] || '?'}
              </div>
              <div>
                <p className="font-medium">{listing.owner.full_name}</p>
                <p className="text-sm text-gray-500">Trust score: {listing.owner.trust_score}/100</p>
              </div>
            </Link>
          </div>

          {reviews.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Reviews</h3>
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {r.reviewer.full_name?.[0] || '?'}
                      </div>
                      <span className="font-medium text-sm">{r.reviewer.full_name}</span>
                      <span className="text-yellow-500 text-sm">{'\u2605'.repeat(r.rating)}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{r.comment}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border p-6 sticky top-4 space-y-4">
            <div className="text-center">
              <span className="text-3xl font-bold">${listing.price_per_day}</span>
              <span className="text-gray-500"> / day</span>
            </div>
            {listing.deposit_amount > 0 && (
              <p className="text-sm text-gray-500 text-center">Refundable deposit: ${listing.deposit_amount}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]} className="w-full border rounded-lg px-3 py-2" />
            </div>
            {total > 0 && (
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Rental ({Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} days)</span><span>${total.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Service fee (15%)</span><span>${serviceFee.toFixed(2)}</span></div>
                {listing.deposit_amount > 0 && <div className="flex justify-between"><span>Refundable deposit</span><span>${listing.deposit_amount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>${(total + serviceFee + (listing.deposit_amount || 0)).toFixed(2)}</span></div>
              </div>
            )}
            <button onClick={handleRentRequest} disabled={!listing.is_available} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
              {listing.is_available ? 'Request to Rent' : 'Not Available'}
            </button>
            <button onClick={() => { if (!user) { router.push('/auth'); return; } router.push(`/messages?to=${listing.owner.id}`); }} className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50">
              Message Owner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
