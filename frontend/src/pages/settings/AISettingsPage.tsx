import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  Sparkles,
  Bot,
  Key,
  Cpu,
  Save,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Terminal,
  Zap,
  DollarSign,
  Wallet,
  TrendingDown,
  CreditCard,
} from 'lucide-react';

export const AISettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState('nvidia/nemotron-3-ultra-550b-a55b:free');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [bankDetails, setBankDetails] = useState('');

  // Playground state
  const [playgroundQuery, setPlaygroundQuery] = useState('Is the black shirt available in XL?');
  const [playgroundResult, setPlaygroundResult] = useState<any | null>(null);

  // Feedback states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // 1. Fetch current settings
  const { data: settings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const res: any = await apiClient.get('/settings/ai');
      return res.data || res;
    },
  });

  useEffect(() => {
    if (settings) {
      setModel(settings.model || 'nvidia/nemotron-3-ultra-550b-a55b:free');
      setSystemPrompt(settings.systemPrompt || '');
      setTemperature(settings.temperature ?? 0.2);
      setBankDetails(settings.bankDetails || '');
    }
  }, [settings]);

  // 2. Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res: any = await apiClient.post('/settings/ai', data);
      return res.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setSaveSuccess(true);
      setApiKey('');
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // 3. Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (data: { apiKey?: string; model?: string }) => {
      const res: any = await apiClient.post('/settings/ai/test-connection', data);
      return res.data || res;
    },
    onSuccess: (data) => {
      setTestResult(`OpenRouter connected! Model: ${data.model} | "${data.response}"`);
      setTestError(null);
    },
    onError: (err: any) => {
      setTestError(err.message || 'OpenRouter connection failed');
      setTestResult(null);
    },
  });

  // 4. Playground execution mutation
  const playgroundMutation = useMutation({
    mutationFn: async (message: string) => {
      const res: any = await apiClient.post('/settings/ai/playground', { message });
      return res.data || res;
    },
    onSuccess: (data) => {
      setPlaygroundResult(data);
    },
    onError: (err: any) => {
      setPlaygroundResult({ error: err.message });
    },
  });

  // 5. Fetch OpenRouter credits
  const { data: credits, isLoading: creditsLoading, isError: creditsError, refetch: refetchCredits } = useQuery({
    queryKey: ['openrouter-credits'],
    queryFn: async () => {
      const res: any = await apiClient.get('/settings/ai/credits');
      return res.data || res;
    },
    retry: false,
    staleTime: 60_000, // refresh every 60s
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      model,
      systemPrompt,
      temperature,
      bankDetails,
    };
    if (apiKey) {
      payload.apiKey = apiKey;
    }
    saveMutation.mutate(payload);
  };

  const handleResetPrompt = () => {
    setSystemPrompt(`You are an AI sales assistant for an online store on Instagram.

Your job is to help customers find products, check availability, answer product questions, and guide customers toward purchasing.

Rules:
1. Never invent product information, prices, or stock levels. The database is the single source of truth.
2. Use product tools (search_products, check_stock, get_price, get_product_details) whenever product info is needed.
3. If multiple products match, list them clearly with prices and ask the customer to choose.
4. If a requested size/variant is out of stock, clearly say so and suggest available sizes.
5. Keep responses concise, warm, helpful, and natural for Instagram DMs.
6. Use emojis where appropriate.
7. If unsure, ask the customer for clarification.`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            AI Sales Engine & OpenRouter <Sparkles className="w-5 h-5 text-pink-500" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure OpenRouter LLMs, temperature, system persona prompt, and real-time database tools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              testMutation.mutate({
                apiKey: apiKey || undefined,
                model,
              })
            }
            disabled={testMutation.isPending}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {testMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-pink-400" />
            )}
            Test OpenRouter API
          </button>
        </div>
      </div>

      {/* Connection Feedback Alerts */}
      {testResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {testError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{testError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>AI configuration saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Configuration Column */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* OpenRouter API Key Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white font-display">OpenRouter API Key</h3>
                  <p className="text-xs text-slate-400">
                    OpenAI-compatible unified API key for multi-model access.
                  </p>
                </div>
              </div>

              {settings?.hasApiKey ? (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Configured ({settings?.maskedApiKey})
                </span>
              ) : (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Not Configured
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  settings?.hasApiKey ? `Leave blank to keep existing (${settings?.maskedApiKey})` : 'sk-or-v1-...'
                }
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Selector Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white font-display">Active AI Model</h3>
                <p className="text-xs text-slate-400">Select free or paid OpenRouter models.</p>
              </div>
            </div>

            <div>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
              >
                {settings?.availableModels?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Temperature: <span className="font-mono text-pink-400">{temperature}</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {temperature <= 0.3 ? 'Deterministic & Exact' : 'Creative'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-pink-500 bg-slate-800"
              />
            </div>
          </div>

          {/* System Prompt Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white font-display">Sales Persona & Prompt Rules</h3>
                  <p className="text-xs text-slate-400">Controls AI behavior, constraints, and tone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetPrompt}
                className="text-xs text-slate-400 hover:text-pink-400 flex items-center gap-1 cursor-pointer"
                title="Reset to recommended default"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <textarea
              rows={10}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Store Bank & UPI Details Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white font-display">Store Bank & UPI Payment Details</h3>
                <p className="text-xs text-slate-400">
                  Shared automatically with customers when placing prepayment orders.
                </p>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="e.g. UPI ID: zerchill@upi&#10;Google Pay / PhonePe: +91 9876543210&#10;Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234"
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold text-xs shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save AI Configuration
            </button>
          </div>
        </form>

        {/* Live Playground & Tools Column */}
        <div className="lg:col-span-5 space-y-6">

          {/* ── OpenRouter Credits Card ── */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white font-display">OpenRouter Credits</h3>
                  <p className="text-xs text-slate-400">Live balance &amp; usage from OpenRouter</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refetchCredits()}
                disabled={creditsLoading}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Refresh balance"
              >
                <RefreshCw className={`w-4 h-4 ${creditsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {creditsLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching balance...
              </div>
            )}

            {creditsError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Could not load credits. Check your API key.
              </div>
            )}

            {credits && !creditsError && (() => {
              const usedPct = credits.totalCredits > 0
                ? Math.min(100, (credits.totalUsage / credits.totalCredits) * 100)
                : 0;
              const barColor = usedPct > 85 ? 'bg-rose-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500';
              const statusColor = usedPct > 85 ? 'text-rose-400' : usedPct > 60 ? 'text-amber-400' : 'text-emerald-400';
              const statusBg = usedPct > 85 ? 'bg-rose-500/10 border-rose-500/20' : usedPct > 60 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20';
              const statusLabel = usedPct > 85 ? 'Low Balance' : usedPct > 60 ? 'Moderate' : 'Healthy';

              return (
                <div className="space-y-4">
                  {/* Free model badge */}
                  {credits.isFreeModel && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-emerald-400 font-medium">
                        Free model active — credits are <strong>not consumed</strong> per message
                      </span>
                    </div>
                  )}

                  {/* Balance rows */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Total</span>
                      </div>
                      <span className="text-sm font-bold text-white font-mono">${credits.totalCredits.toFixed(3)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Used</span>
                      </div>
                      <span className="text-sm font-bold text-rose-300 font-mono">${credits.totalUsage.toFixed(4)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">Left</span>
                      </div>
                      <span className={`text-sm font-bold font-mono ${statusColor}`}>${credits.remaining.toFixed(4)}</span>
                    </div>
                  </div>

                  {/* Usage progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-400">Credit consumption</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusBg} ${statusColor}`}>
                        {statusLabel} · {usedPct.toFixed(1)}% used
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Active model */}
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    Model: <span className="text-slate-300">{credits.model}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Live Playground ── */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white font-display">Live AI Test Playground</h3>
                <p className="text-xs text-slate-400">
                  Simulate incoming customer questions and inspect live tool calls.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sample Customer Inquiry
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playgroundQuery}
                    onChange={(e) => setPlaygroundQuery(e.target.value)}
                    placeholder="e.g. Do you have black t-shirts in XL?"
                    className="flex-1 px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => playgroundMutation.mutate(playgroundQuery)}
                    disabled={playgroundMutation.isPending || !playgroundQuery}
                    className="px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/30 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {playgroundMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Run
                  </button>
                </div>
              </div>

              {/* Playground Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Is the black shirt available in XL?',
                  'How much is the black hoodie?',
                  'What black items do you have?',
                  'Do you have any blue jeans?',
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setPlaygroundQuery(q);
                      playgroundMutation.mutate(q);
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Output */}
            {playgroundResult && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">AI Response Output:</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {playgroundResult.toolCallsCount || 0} tool calls
                  </span>
                </div>

                {playgroundResult.error ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {playgroundResult.error}
                  </div>
                ) : (
                  <>
                    {/* Tools Executed Badges */}
                    {playgroundResult.toolsExecuted?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {playgroundResult.toolsExecuted.map((t: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            🛠️ {t}()
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Chat Bubble Result */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
                      {playgroundResult.reply}
                    </div>

                    {playgroundResult.selectedProductId && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        Selected Product ID: <span className="text-pink-400">{playgroundResult.selectedProductId}</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
