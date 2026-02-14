'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Conversation {
  id: string;
  listing_id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  listing: { title: string };
  participant1: { id: string; full_name: string; avatar_url: string | null };
  participant2: { id: string; full_name: string; avatar_url: string | null };
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    if (activeConvo) {
      fetchMessages(activeConvo.id);
      markAsRead(activeConvo.id);
      const channel = supabase
        .channel(`messages:${activeConvo.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvo.id}` }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchConversations() {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select(`*, listing:listings(title), participant1:profiles!conversations_participant1_id_fkey(id, full_name, avatar_url), participant2:profiles!conversations_participant2_id_fkey(id, full_name, avatar_url)`)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    setConversations(data || []);
    setLoading(false);

    const toUserId = searchParams.get('to');
    if (toUserId && data) {
      const existing = data.find(c =>
        (c.participant1_id === user.id && c.participant2_id === toUserId) ||
        (c.participant2_id === user.id && c.participant1_id === toUserId)
      );
      if (existing) setActiveConvo(existing);
    }
  }

  async function fetchMessages(convoId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function markAsRead(convoId: string) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convoId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConvo.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (!error) {
      setNewMessage('');
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConvo.id);
    }
  }

  function getOtherUser(convo: Conversation) {
    return convo.participant1_id === user?.id ? convo.participant2 : convo.participant1;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Messages</h1>
        <Link href="/" className="text-blue-600 text-sm">Home</Link>
      </nav>

      <div className="flex-1 flex max-w-5xl mx-auto w-full">
        <div className={`w-full md:w-80 border-r bg-white ${activeConvo ? 'hidden md:block' : ''}`}>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500">No conversations yet</p>
              <Link href="/browse" className="text-blue-600 text-sm mt-2 inline-block">Browse items to start chatting</Link>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map(convo => {
                const other = getOtherUser(convo);
                return (
                  <button key={convo.id} onClick={() => setActiveConvo(convo)} className={`w-full p-4 text-left hover:bg-gray-50 flex items-center gap-3 ${activeConvo?.id === convo.id ? 'bg-blue-50' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                      {other.full_name?.[0] || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{other.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{convo.listing?.title}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(convo.last_message_at).toLocaleDateString()}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={`flex-1 flex flex-col ${!activeConvo ? 'hidden md:flex' : ''}`}>
          {activeConvo ? (
            <>
              <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
                <button onClick={() => setActiveConvo(null)} className="md:hidden text-gray-600">&larr;</button>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {getOtherUser(activeConvo).full_name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-medium text-sm">{getOtherUser(activeConvo).full_name}</p>
                  <p className="text-xs text-gray-500">{activeConvo.listing?.title}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === user.id ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="bg-white border-t p-3 flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300">Send</button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
