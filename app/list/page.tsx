'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function ListItemPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    price_per_day: '',
    deposit_amount: '',
    condition: 'good',
    pickup_instructions: '',
    address_text: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
    });
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 8) { alert('Maximum 8 photos'); return; }
    setPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.category_id || !form.price_per_day) {
      alert('Please fill in required fields');
      return;
    }
    setLoading(true);

    try {
      const { data: listing, error } = await supabase.from('listings').insert({
        owner_id: user.id,
        title: form.title,
        description: form.description,
        category_id: form.category_id,
        price_per_day: parseFloat(form.price_per_day),
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        condition: form.condition,
        pickup_instructions: form.pickup_instructions,
        address_text: form.address_text,
        latitude: 0,
        longitude: 0,
      }).select().single();

      if (error) throw error;

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop();
        const path = `${listing.id}/${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(path, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('listing-photos')
            .getPublicUrl(path);
          await supabase.from('listing_photos').insert({
            listing_id: listing.id,
            photo_url: urlData.publicUrl,
            display_order: i,
          });
        }
      }

      router.push(`/listing/${listing.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">&larr; Back</button>
        <h1 className="font-semibold text-lg">List an Item</h1>
      </nav>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Photos</h2>
          <div className="grid grid-cols-4 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">&times;</button>
              </div>
            ))}
            {photos.length < 8 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400">
                <span className="text-3xl text-gray-400">+</span>
                <span className="text-xs text-gray-500">Add photo</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Canon EOS R5 Camera" className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} placeholder="Describe your item, what's included, any rules..." className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
              <option value="">Select a category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              <option value="like_new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="worn">Worn</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Pricing</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per day ($) *</label>
            <input type="number" min="1" step="0.01" value={form.price_per_day} onChange={e => setForm({...form, price_per_day: e.target.value})} placeholder="25.00" className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refundable deposit ($)</label>
            <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={e => setForm({...form, deposit_amount: e.target.value})} placeholder="100.00" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <p className="text-sm text-gray-500">You&apos;ll receive 85% of the rental price. IdleAssets takes a 15% service fee.</p>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Pickup</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
            <input type="text" value={form.address_text} onChange={e => setForm({...form, address_text: e.target.value})} placeholder="Neighborhood or intersection" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Instructions</label>
            <textarea value={form.pickup_instructions} onChange={e => setForm({...form, pickup_instructions: e.target.value})} rows={2} placeholder="e.g. Meet at lobby, available 9am-6pm" className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300">
          {loading ? 'Creating Listing...' : 'List Item'}
        </button>
      </form>
    </div>
  );
}
