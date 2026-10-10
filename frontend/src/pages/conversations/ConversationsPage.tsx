import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Bot,
  User,
  CheckCircle,
  RefreshCw,
  Package,
  Loader2,
  Zap,
} from 'lucide-react';
import { conversationsApi } from '../../api/conversations';
import type { Conversation, ConversationStatus, Message } from '../../types';

export const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoadingList(true);
      const data = await conversationsApi.getAll({
        status:
          statusFilter === 'all'
            ? undefined
            : (statusFilter as ConversationStatus),
        search: searchQuery || undefined,
      });
      const list = Array.isArray(data) ? data : [];
      setConversations(list);

      // Auto-select first conversation if none selected
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  const fetchSingleConversation = async (id: string) => {
    try {
      const data = await conversationsApi.getById(id);
      setSelectedConversation(data);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  // Initial load & filter change
  useEffect(() => {
    fetchConversations();
  }, [statusFilter, searchQuery]);

  // Load chat when selected ID changes
  useEffect(() => {
    if (selectedId) {
      fetchSingleConversation(selectedId);
    }
  }, [selectedId]);

  // Polling interval (every 4 seconds for live updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedId) {
        fetchSingleConversation(selectedId);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedId, statusFilter, searchQuery]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchConversations();
    if (selectedId) await fetchSingleConversation(selectedId);
    setIsRefreshing(false);
  };

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (!selectedId) return;
    try {
      await conversationsApi.updateStatus(selectedId, newStatus);
      fetchSingleConversation(selectedId);
      fetchConversations(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim() || sendingReply) return;

    try {
      setSendingReply(true);
      const textToSend = replyText.trim();
      setReplyText('');
      await conversationsApi.sendReply(selectedId, textToSend);
      fetchSingleConversation(selectedId);
      fetchConversations(true);
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status: ConversationStatus) => {
    switch (status) {
      case 'AI_ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-medium flex items-center gap-1">
            <Bot className="w-3 h-3" /> AI Handling
          </span>
        );
      case 'HUMAN_ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium flex items-center gap-1">
            <User className="w-3 h-3" /> Human Agent
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-700/50 border border-slate-700 text-slate-400 text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Instagram Live Inbox <MessageSquare className="w-6 h-6 text-pink-500" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time DM streams, AI reasoning logs, and instant human takeover.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Inbox Two-Column Container */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Left Column: Conversations List */}
        <div className="col-span-12 md:col-span-4 lg:col-span-4 glass-panel rounded-2xl flex flex-col overflow-hidden border border-slate-800">
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'AI_ACTIVE', label: '🤖 AI' },
                { id: 'HUMAN_ACTIVE', label: '👤 Human' },
                { id: 'CLOSED', label: 'Closed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-pink-500 text-white'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loadingList && conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No conversations found.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const lastMsg =
                  conv.messages && conv.messages.length > 0
                    ? conv.messages[0].content
                    : 'No messages yet';

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-l-4 border-l-pink-500'
                        : 'hover:bg-slate-800/40 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                      {conv.customer?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-white truncate">
                          @{conv.customer?.username || conv.customer?.instagramUserId}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate mb-1.5">
                        {lastMsg}
                      </p>

                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getStatusBadge(conv.status)}
                          {conv.selectedProduct && (
                            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 truncate max-w-[90px]">
                              {conv.selectedProduct.name}
                            </span>
                          )}
                        </div>
                        {Boolean(conv.tokensUsed?.total) && (
                          <span
                            className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5 shrink-0"
                            title={`Total: ${conv.tokensUsed?.total} (Prompt: ${conv.tokensUsed?.prompt}, Completion: ${conv.tokensUsed?.completion})`}
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-400" />
                            {conv.tokensUsed!.total.toLocaleString()} tok
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat View & Live Takeover */}
        <div className="col-span-12 md:col-span-8 lg:col-span-8 glass-panel rounded-2xl flex flex-col overflow-hidden border border-slate-800">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-700" />
              <p className="text-sm">Select a conversation from the left to view chat.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
                    {selectedConversation.customer?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-sm">
                        @{selectedConversation.customer?.username || 'User'}
                      </h3>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                        IGSID: {selectedConversation.customer?.instagramUserId}
                      </span>
                      {selectedConversation.tokensUsed && (
                        <span
                          className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono"
                          title={`Prompt Tokens: ${selectedConversation.tokensUsed.prompt.toLocaleString()} | Completion Tokens: ${selectedConversation.tokensUsed.completion.toLocaleString()}`}
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="font-semibold">{selectedConversation.tokensUsed.total.toLocaleString()}</span> tokens
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Connected to @{selectedConversation.customer?.instagramAccount?.username || 'bot'}
                    </p>
                  </div>
                </div>

                {/* Status Switcher / Takeover Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 mr-1">Mode:</span>
                  <button
                    onClick={() => handleStatusChange('AI_ACTIVE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedConversation.status === 'AI_ACTIVE'
                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" /> AI Bot
                  </button>

                  <button
                    onClick={() => handleStatusChange('HUMAN_ACTIVE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedConversation.status === 'HUMAN_ACTIVE'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Take Over (Human)
                  </button>

                  <button
                    onClick={() =>
                      handleStatusChange(
                        selectedConversation.status === 'CLOSED'
                          ? 'AI_ACTIVE'
                          : 'CLOSED'
                      )
                    }
                    className={`p-1.5 rounded-xl text-xs border transition-colors ${
                      selectedConversation.status === 'CLOSED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title={
                      selectedConversation.status === 'CLOSED'
                        ? 'Reopen Conversation'
                        : 'Close Conversation'
                    }
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Product Info Banner if Selected */}
              {selectedConversation.selectedProduct && (
                <div className="px-4 py-2 bg-purple-950/30 border-b border-purple-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Package className="w-4 h-4 text-purple-400" />
                    <span>Customer inquiring about:</span>
                    <strong className="text-white">
                      {selectedConversation.selectedProduct.name} ($
                      {selectedConversation.selectedProduct.price})
                    </strong>
                  </div>
                </div>
              )}

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/40">
                {selectedConversation.messages &&
                selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((msg: Message) => {
                    const isInbound = msg.direction === 'INBOUND';
                    const isAi = msg.senderType === 'AI';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isInbound ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-md text-xs leading-relaxed ${
                            isInbound
                              ? 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-sm'
                              : isAi
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm'
                              : 'bg-amber-600 text-white rounded-tr-sm'
                          }`}
                        >
                          {/* Sender label */}
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1 pb-1 border-b border-white/10">
                            <span className="font-semibold flex items-center gap-1">
                              {isInbound ? (
                                <>
                                  <User className="w-2.5 h-2.5" /> Customer
                                </>
                              ) : isAi ? (
                                <>
                                  <Bot className="w-2.5 h-2.5" /> AI Assistant
                                </>
                              ) : (
                                <>
                                  <User className="w-2.5 h-2.5" /> Staff (Manual)
                                </>
                              )}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isAi && (msg.metadata as any)?.tokens?.total && (
                                <span
                                  className="text-[9px] bg-black/30 border border-white/10 px-1.5 py-0.5 rounded text-amber-200 flex items-center gap-0.5 font-mono"
                                  title={`Prompt: ${(msg.metadata as any).tokens.prompt} | Completion: ${(msg.metadata as any).tokens.completion}`}
                                >
                                  <Zap className="w-2 h-2 text-amber-300" />
                                  {(msg.metadata as any).tokens.total} tok
                                </span>
                              )}
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No message history yet.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendReply}
                className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2"
              >
                {selectedConversation.status === 'AI_ACTIVE' && (
                  <span
                    className="text-[11px] text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg border border-pink-500/20 shrink-0 hidden sm:inline-block"
                    title="Sending a manual reply will switch the mode to Human takeover"
                  >
                    💡 Typing will switch to Human Mode
                  </span>
                )}

                <input
                  type="text"
                  placeholder="Type a message to send directly to Instagram DM..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {sendingReply ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
