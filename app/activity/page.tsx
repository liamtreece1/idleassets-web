'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Tab = 'renting' | 'lending';

interface Rental {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_amount: number;
  created_at: string;
  listing: { id: string; title: string; listing_photos: { photo_url: string }[] };
  renter: { id: string; full_name: string };
  owner: { id: string; full_name: string };
}

const statusColors: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  pickup_confirmed: 'bg-indigo-100 text-indigo-800',
  return_pending: 'bg-orange-100 text-orange-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  disputed: 'bg-red-100 text-red-800',
};

export default function ActivityPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('renting');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (user) fetchRentals();
  }, [user, tab]);

  async function fetchRentals() {
    setLoading(true);
    const query = supabase
      .from('rentals')
      .select(`*, listing:listings(id, title, listing_photos(photo_url)), renter:profiles!rentals_renter_id_fkey(id, full_name), owner:profiles!rentals_owner_id_fkey(id, full_name)`)
      .order('created_at', { ascending: false });

    if (tab === 'renting') {
      query.eq('renter_id', user.id);
    } else {
      query.eq('owner_id', user.id);
    }

    const { data } = await query;
    setRentals(data || []);
    setLoading(false);
  }

  async function updateStatus(rentalId: string, newStatus: string) {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api/rentals/${rentalId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      }
    );
    if (res.ok) fetchRentals();
    else {
      const err = await res.json();
      alert(err.error || 'Failed to update status');
    }
  }

  function getActions(rental: Rental) {
    const isOwner = user?.id === rental.owner?.id;
    const actions: { label: string; status: string; color: string }[] = [];

    if (isOwner && rental.status === 'requested') {
      actions.push({ label: 'Approve', status: 'approved', color: 'bg-green-600 hover:bg-green-700' });
      actions.push({ label: 'Decline', status: 'cancelled', color: 'bg-red-600 hover:bg-red-700' });
    }
    if (!isOwner && rental.status === 'approved') {
      actions.push({ label: 'Confirm Pickup', status: 'pickup_confirmed', color: 'bg-blue-600 hover:bg-blue-700' });
    }
    if (isOwner && rental.status === 'pickup_confirmed') {
      actions.push({ label: 'Mark Active', status: 'active', color: 'bg-green-600 hover:bg-green-700' });
    }
    if (!isOwner && rental.status === 'active') {
      actions.push({ label: 'Return Item', status: 'return_pending', color: 'bg-orange-600 hover:bg-orange-700' });
    }
    if (isOwner && rental.status === 'return_pending') {
      actions.push({ label: 'Confirm Return', status: 'completed', color: 'bg-green-600 hover:bg-green-700' });
      actions.push({ label: 'Dispute', status: 'disputed', color: 'bg-red-600 hover:bg-red-700' });
    }
    if (rental.status === 'requested' && !isOwner) {
      actions.push({ label: 'Cancel', status: 'cancelled', color: 'bg-gray-600 hover:bg-gray-700' });
    }
    return actions;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Activity</h1>
        <Link href="/" className="text-blue-600 text-sm">Home</Link>
      </nav>

      <div className="max-w-3xl mx-auto p-4">
        <div className="flex bg-gray-200 rounded-lg p-1 mb-6">
          <button onClick={() => setTab('renting')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === 'renting' ? 'bg-white shadow' : 'text-gray-600'}`}>
            My Rentals
          </button>
          <button onClick={() => setTab('lending')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === 'lending' ? 'bg-white shadow' : 'text-gray-600'}`}>
            My Listings
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No activity yet</p>
            <Link href={tab === 'renting' ? '/browse' : '/list'} className="text-blue-600 mt-2 inline-block">
              {tab === 'renting' ? 'Browse items to rent' : 'List an item'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map(rental => {
              const photo = rental.listing?.listing_photos?.[0]?.photo_url;
              const actions = getActions(rental);
              return (
                <div key={rental.id} className="bg-white rounded-xl border p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                      {photo && <img src={photo} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/listing/${rental.listing?.id}`} className="font-semibold hover:text-blue-600 truncate block">
                        {rental.listing?.title || 'Unknown listing'}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {new Date(rental.start_date).toLocaleDateString()} &ndash; {new Date(rental.end_date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[rental.status] || 'bg-gray-100'}`}>
                          {rental.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium">${rental.total_price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {tab === 'renting' ? `Owner: ${rental.owner?.full_name}` : `Renter: ${rental.renter?.full_name}`}
                      </p>
                    </div>
                  </div>
                  {actions.length > 0 && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {actions.map(action => (
                        <button key={action.status} onClick={() => updateStatus(rental.id, action.status)} className={`px-4 py-1.5 rounded-lg text-white text-sm font-medium ${action.color}`}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2">
        <Link href="/" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\u2302</span>Home</Link>
        <Link href="/browse" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDD0D</span>Browse</Link>
        <Link href="/list" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\u2795</span>List</Link>
        <Link href="/activity" className="flex flex-col items-center text-blue-600 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDCCB</span>Activity</Link>
        <Link href="/messages" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDCAC</span>Messages</Link>
        <Link href="/profile" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDC64</span>Profile</Link>
      </div>
    </div>
  );
}
