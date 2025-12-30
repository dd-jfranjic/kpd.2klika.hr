'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  MessageSquare,
  Loader2,
  User,
  Headphones,
  Send,
  Clock,
  CheckCircle,
  Archive,
  ChevronLeft,
  MoreVertical,
} from 'lucide-react';

interface ThreadUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Thread {
  id: string;
  userId: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  lastMessageAt: string | null;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: string;
  user?: ThreadUser;
  lastMessage?: {
    body: string;
    senderType: 'USER' | 'ADMIN';
    createdAt: string;
  };
}

interface Message {
  id: string;
  threadId: string;
  senderType: 'USER' | 'ADMIN';
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export default function AdminSupportPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchThreads();
    }
  }, [token, isAdmin, statusFilter]);

  useEffect(() => {
    if (selectedThread && token) {
      fetchMessages(selectedThread.id);
    }
  }, [selectedThread, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchThreads = async () => {
    if (!token) return;
    setLoadingThreads(true);
    try {
      const res = await fetch(`/api/v1/admin/support/inbox?status=${statusFilter}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setThreads(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    }
    setLoadingThreads(false);
  };

  const fetchMessages = async (threadId: string) => {
    if (!token) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/v1/admin/support/threads/${threadId}/messages?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
        // Update thread's unread count in local state
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, unreadByAdmin: 0 } : t))
        );
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
    setLoadingMessages(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedThread || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/v1/admin/support/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ body: newMessage.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.data]);
        setNewMessage('');
        // Update thread in list
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedThread.id
              ? { ...t, lastMessage: { body: newMessage.trim(), senderType: 'ADMIN', createdAt: new Date().toISOString() } }
              : t
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSending(false);
  };

  const updateThreadStatus = async (status: 'OPEN' | 'CLOSED' | 'ARCHIVED') => {
    if (!token || !selectedThread) return;
    try {
      const res = await fetch(`/api/v1/admin/support/threads/${selectedThread.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setSelectedThread({ ...selectedThread, status });
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedThread.id ? { ...t, status } : t))
        );
        if (status !== statusFilter && statusFilter !== 'ALL') {
          // Remove from current list if filter doesn't match
          setThreads((prev) => prev.filter((t) => t.id !== selectedThread.id));
          setSelectedThread(null);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
    setShowStatusMenu(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Upravo';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays < 7) return `${diffDays} d`;
    return date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  };

  const getUserName = (thread: Thread) => {
    if (thread.user?.firstName || thread.user?.lastName) {
      return `${thread.user.firstName || ''} ${thread.user.lastName || ''}`.trim();
    }
    return thread.user?.email?.split('@')[0] || 'Korisnik';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'CLOSED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ARCHIVED':
        return <Archive className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Sidebar - Thread List */}
        <div className={`w-80 border-r border-gray-200 flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Support Inbox</h2>
              <span className="text-xs text-gray-500">{threads.length} razgovora</span>
            </div>
            {/* Status Filter */}
            <div className="flex gap-1">
              {['OPEN', 'CLOSED', 'ARCHIVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {status === 'OPEN' ? 'Otvoreni' : status === 'CLOSED' ? 'Zatvoreni' : 'Arhivirani'}
                </button>
              ))}
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nema razgovora</p>
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedThread?.id === thread.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {getUserName(thread)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(thread.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {thread.lastMessage?.body || 'Nema poruka'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(thread.status)}
                        {thread.unreadByAdmin > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                            {thread.unreadByAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col ${!selectedThread ? 'hidden md:flex' : 'flex'}`}>
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{getUserName(selectedThread)}</h3>
                    <p className="text-sm text-gray-500">{selectedThread.user?.email}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                      <button
                        onClick={() => updateThreadStatus('OPEN')}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4 text-orange-500" />
                        Označi kao otvoren
                      </button>
                      <button
                        onClick={() => updateThreadStatus('CLOSED')}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Označi kao riješen
                      </button>
                      <button
                        onClick={() => updateThreadStatus('ARCHIVED')}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4 text-gray-400" />
                        Arhiviraj
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[70%] ${message.senderType === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                            message.senderType === 'ADMIN' ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {message.senderType === 'ADMIN' ? (
                              <Headphones className="w-4 h-4 text-green-600" />
                            ) : (
                              <User className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className={`rounded-2xl px-4 py-2.5 ${
                            message.senderType === 'ADMIN'
                              ? 'bg-green-600 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-900 rounded-bl-md'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                            <p className={`text-xs mt-1 ${
                              message.senderType === 'ADMIN' ? 'text-green-200' : 'text-gray-400'
                            }`}>
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Napišite odgovor..."
                    rows={1}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-lg">Odaberite razgovor</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
