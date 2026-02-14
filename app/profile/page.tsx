'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  phone: string;
  trust_score: number;
  is_id_verified: boolean;
  stripe_account_id: string | null;
  created_at: string;
}

interface Earnings {
  total_earned: number;
  pending_amount: number;
  available_amount: number;
  total_rentals: number;
}

interface Listing {
  id: string;
  title: string;
  price_per_day: number;
  is_available: boolean;
  avg_rating: number;
  total_rentals: number;
  listing_photos: { photo_url: string }[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', bio: '', phone: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchEarnings();
      fetchMyListings();
    }
  }, [user]);

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data);
      setEditForm({ full_name: data.full_name || '', bio: data.bio || '', phone: data.phone || '' });
    }
    setLoading(false);
  }

  async function fetchEarnings() {
    const session = (await supabase.auth.getSession()).data.session;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api/earnings`,
        { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
      );
      if (res.ok) setEarnings(await res.json());
    } catch {}
  }

  async function fetchMyListings() {
    const { data } = await supabase
      .from('listings')
      .select('id, title, price_per_day, is_available, avg_rating, total_rentals, listing_photos(photo_url)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setListings(data || []);
  }

  async function saveProfile() {
    const { error } = await supabase
      .from('profiles')
      .update(editForm)
      .eq('id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: data.publicUrl } : null);
    }
  }

  async function connectStripe() {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe/connect-onboard`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ return_url: window.location.href }),
      }
    );
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || 'Failed to start Stripe onboarding');
  }

  async function verifyIdentity() {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe/create-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ return_url: window.location.href }),
      }
    );
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || 'Failed to start verification');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Profile</h1>
        <button onClick={handleSignOut} className="text-red-600 text-sm font-medium">Sign Out</button>
      </nav>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile?.full_name?.[0] || '?'}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
            <div>
              {editing ? (
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="border rounded px-2 py-1 font-semibold text-lg" />
              ) : (
                <h2 className="font-semibold text-lg">{profile?.full_name || 'Set your name'}</h2>
              )}
              <p className="text-sm text-gray-500">Member since {new Date(profile?.created_at || '').toLocaleDateString()}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm">Trust: {profile?.trust_score || 0}/100</span>
                {profile?.is_id_verified && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">ID Verified</span>}
              </div>
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={3} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProfile} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
                <button onClick={() => setEditing(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {profile?.bio && <p className="text-gray-700 mb-3">{profile.bio}</p>}
              <button onClick={() => setEditing(true)} className="text-blue-600 text-sm font-medium">Edit Profile</button>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Verification & Payments</h3>
          <div className="grid grid-cols-2 gap-3">
            {!profile?.is_id_verified && (
              <button onClick={verifyIdentity} className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:bg-blue-50">
                <span className="text-2xl block mb-1">\uD83C\uDD94</span>
                <span className="text-sm font-medium text-blue-600">Verify ID</span>
              </button>
            )}
            {!profile?.stripe_account_id ? (
              <button onClick={connectStripe} className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center hover:bg-green-50">
                <span className="text-2xl block mb-1">\uD83D\uDCB3</span>
                <span className="text-sm font-medium text-green-600">Connect Stripe</span>
              </button>
            ) : (
              <div className="border rounded-lg p-4 text-center bg-green-50">
                <span className="text-2xl block mb-1">\u2705</span>
                <span className="text-sm font-medium text-green-700">Stripe Connected</span>
              </div>
            )}
          </div>
        </div>

        {earnings && (
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Earnings Dashboard</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">Total Earned</p>
                <p className="text-2xl font-bold text-green-700">${earnings.total_earned.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600">Available</p>
                <p className="text-2xl font-bold text-blue-700">${earnings.available_amount.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">${earnings.pending_amount.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600">Total Rentals</p>
                <p className="text-2xl font-bold text-purple-700">{earnings.total_rentals}</p>
              </div>
            </div>
          </div>
        )}

        {listings.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">My Listings</h3>
              <Link href="/list" className="text-blue-600 text-sm">+ Add New</Link>
            </div>
            <div className="space-y-3">
              {listings.map(item => (
                <Link key={item.id} href={`/listing/${item.id}`} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg -mx-2">
                  <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                    {item.listing_photos?.[0]?.photo_url && <img src={item.listing_photos[0].photo_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-sm text-gray-500">${item.price_per_day}/day &middot; {item.total_rentals} rentals</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.is_available ? 'Active' : 'Paused'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2">
        <Link href="/" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\u2302</span>Home</Link>
        <Link href="/browse" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDD0D</span>Browse</Link>
        <Link href="/list" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\u2795</span>List</Link>
        <Link href="/activity" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDCCB</span>Activity</Link>
        <Link href="/messages" className="flex flex-col items-center text-gray-400 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDCAC</span>Messages</Link>
        <Link href="/profile" className="flex flex-col items-center text-blue-600 text-xs py-1"><span className="text-xl mb-0.5">\uD83D\uDC64</span>Profile</Link>
      </div>
    </div>
  );
}
