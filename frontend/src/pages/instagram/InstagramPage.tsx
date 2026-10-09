import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  ShieldCheck,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Key,
  Layers,
  RefreshCw,
} from 'lucide-react';

import { InstagramIcon } from '../../components/common/InstagramIcon';
import type { InstagramAccount } from '../../types';

export const InstagramPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedAccountForTest, setSelectedAccountForTest] = useState<string>('');

  const statusParam = searchParams.get('status');
  const messageParam = searchParams.get('message');
  const [oauthNotice, setOauthNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (statusParam === 'connected') {
      setOauthNotice({
        type: 'success',
        message: 'Successfully linked your Instagram Business account via Meta OAuth!',
      });
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      searchParams.delete('status');
      setSearchParams(searchParams, { replace: true });
    } else if (statusParam === 'error') {
      setOauthNotice({
        type: 'error',
        message: messageParam || 'Failed to link Instagram account. Meta returned an authorization error.',
      });
      searchParams.delete('status');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [statusParam, messageParam]);

  // Form states
  const [accessToken, setAccessToken] = useState('');
  const [instagramUserId, setInstagramUserId] = useState('');
  const [username, setUsername] = useState('');

  // Test send states
  const [recipientId, setRecipientId] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from InstaSales AI! 🛍️');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // 1. Fetch connected accounts
  const { data: accounts, isLoading } = useQuery<InstagramAccount[]>({
    queryKey: ['instagram-accounts'],
    queryFn: async () => {
      const res: any = await apiClient.get('/instagram/accounts');
      return res.data || res || [];
    },
  });

  // 2. Direct connect mutation
  const directConnectMutation = useMutation({
    mutationFn: async (data: { accessToken: string; instagramUserId?: string; username?: string }) => {
      const res: any = await apiClient.post('/instagram/connect-direct', data);
      return res.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setShowDirectModal(false);
      setAccessToken('');
      setInstagramUserId('');
      setUsername('');
    },
  });

  // 3. Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await apiClient.delete(`/instagram/accounts/${id}`);
      return res.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  // 4. Test send mutation
  const testSendMutation = useMutation({
    mutationFn: async (data: { accountId: string; recipientId: string; text: string }) => {
      const res: any = await apiClient.post('/instagram/test-send', data);
      return res.data || res;
    },
    onSuccess: (data) => {
      setTestResult(`Message sent! Meta Message ID: ${data?.messageId || 'Success'}`);
      setTestError(null);
    },
    onError: (err: any) => {
      setTestError(err.message || 'Failed to send message');
      setTestResult(null);
    },
  });

  // 5. OAuth Connect Handler
  const handleOAuthConnect = async () => {
    try {
      const res: any = await apiClient.get('/instagram/connect-url');
      if (res?.data?.url || res?.url) {
        window.location.href = res.data?.url || res.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate Meta OAuth URL. Please verify Meta App credentials.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Instagram Professional Connection <InstagramIcon className="w-5 h-5 text-pink-500" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Official Meta Graph API OAuth & Webhook Ingress for Instagram Business messaging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDirectModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4 text-pink-400" /> Direct Token Setup
          </button>
          <button
            onClick={handleOAuthConnect}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs font-semibold text-white shadow-lg shadow-pink-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <InstagramIcon className="w-4 h-4" /> Meta OAuth Login
          </button>
        </div>
      </div>

      {/* OAuth Notice Banner */}
      {oauthNotice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            oauthNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {oauthNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">
            <p className="font-semibold">{oauthNotice.type === 'success' ? 'Connection Successful' : 'Meta Authorization Notice'}</p>
            <p className="text-xs opacity-90 mt-0.5">{oauthNotice.message}</p>
          </div>
          <button
            onClick={() => setOauthNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white font-display flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-400" /> Linked Accounts ({accounts?.length || 0})
        </h2>

        {isLoading ? (
          <div className="glass-panel p-8 rounded-2xl flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-pink-500 animate-spin" />
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                      <InstagramIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">@{acc.username}</h3>
                      <p className="text-xs text-slate-400 font-mono">ID: {acc.instagramUserId}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <p>
                    Status:{' '}
                    <span className="text-slate-200 font-medium font-mono">{acc.status}</span>
                  </p>
                  <p>
                    Linked on:{' '}
                    <span className="text-slate-300">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                  <p>
                    Token Encryption:{' '}
                    <span className="text-emerald-400 font-mono">AES-256-GCM</span>
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedAccountForTest(acc.id);
                      setShowTestModal(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Test DM
                  </button>
                  <button
                    onClick={() => deleteAccountMutation.mutate(acc.id)}
                    disabled={deleteAccountMutation.isPending}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
                    title="Disconnect account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center mx-auto border border-pink-500/20">
              <InstagramIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">No Instagram Account Connected</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Link your Instagram Professional or Business account using Meta OAuth or Direct Token setup to start receiving customer messages and generating sales replies.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDirectModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 cursor-pointer"
              >
                Direct Token Setup
              </button>
              <button
                onClick={handleOAuthConnect}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-xs font-semibold text-white cursor-pointer"
              >
                Connect with Meta Login
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Meta Webhook Integration Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white font-display">
                Meta Webhook Ingress Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Configure this Callback URL and Verify Token inside your Meta App Developer Portal.
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Handshake Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Callback URL (Webhook Ingress)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin.replace(':5173', ':3000')}/webhooks/instagram`}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 select-all"
              />
              <button
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin.replace(':5173', ':3000')}/webhooks/instagram`,
                  )
                }
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Verify Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="insta_bot_webhook_token_2026"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-pink-400 select-all"
              />
              <button
                onClick={() => copyToClipboard('insta_bot_webhook_token_2026')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Copy Token"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {copiedWebhook && (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Copied to clipboard!
          </p>
        )}
      </div>

      {/* Direct Connect Modal */}
      {showDirectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-pink-400" /> Direct Token / Account Setup
              </h3>
              <button
                onClick={() => setShowDirectModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide a Meta Page Access Token with <span className="font-mono text-pink-400">instagram_manage_messages</span> permission.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                directConnectMutation.mutate({
                  accessToken,
                  instagramUserId: instagramUserId || undefined,
                  username: username || undefined,
                });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Page Access Token *
                </label>
                <textarea
                  required
                  rows={3}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAB..."
                  className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Instagram Account ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={instagramUserId}
                    onChange={(e) => setInstagramUserId(e.target.value)}
                    placeholder="1784140..."
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Instagram Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="mystore_official"
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {directConnectMutation.isError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{(directConnectMutation.error as any)?.message || 'Connection failed'}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directConnectMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {directConnectMutation.isPending && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Save & Encrypt Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Message Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-pink-400" /> Send Test Instagram DM
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                testSendMutation.mutate({
                  accountId: selectedAccountForTest,
                  recipientId,
                  text: testMessage,
                });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Recipient Instagram User ID (IGSID) *
                </label>
                <input
                  type="text"
                  required
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder="e.g. 17841459..."
                  className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Message Text *
                </label>
                <input
                  type="text"
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                />
              </div>

              {testResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{testResult}</span>
                </div>
              )}

              {testError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testSendMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {testSendMutation.isPending && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
