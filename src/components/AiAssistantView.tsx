import React, { useEffect, useState } from 'react';
import { Send, ThumbsDown, ThumbsUp, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { AiChatMessage, AirQualityPayload, HouseholdProfile } from '../types/breathewise';

interface AiAssistantViewProps {
  airData: AirQualityPayload | null;
  profile: HouseholdProfile;
}

const SUGGESTED_QUESTIONS = [
  'Is it safe for my children to play outside this evening?',
  'Should I go cycling tomorrow morning or exercise indoors?',
  'How can I protect my family from winter smog tonight?',
  'What should I do if my indoor air feels smoky after cooking?',
  'Is walking or taking a bus a better option for my commute today?',
  'How can we cut our household pollution footprint practically?',
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ airData, profile }) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorState, setErrorState] = useState<{
    message: string;
    officialFallback?: { label: string; general: string; sensitive: string };
  } | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getAiHistory()
      .then((res) => {
        if (active) setMessages(res.messages);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSend(questionText?: string) {
    const text = (questionText ?? input).trim();
    if (!text || sending) return;
    setErrorState(null);
    setSending(true);
    setInput('');

    const optimisticUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const { reply } = await api.sendAiChat(text);
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      const typed = err as Error & {
        payload?: {
          officialReferenceFallback?: { label: string; general: string; sensitive: string };
        };
      };
      setErrorState({
        message: typed.message || 'AI Assistant could not respond right now.',
        officialFallback: typed.payload?.officialReferenceFallback,
      });
    } finally {
      setSending(false);
    }
  }

  async function handleFeedback(msgId: number | string, rating: 1 | -1) {
    if (typeof msgId !== 'number') return;
    try {
      await api.submitAiFeedback(msgId, rating);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, rating } : m)));
    } catch {
      // ignore transient feedback error
    }
  }

  async function handleClear() {
    await api.clearAiHistory();
    setMessages([]);
    setErrorState(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8E4] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-[#546860]">
            Grounded Context · {airData?.location.name ?? 'Loading'} · AQI {airData?.aqi ?? 'Unavailable'} ({airData?.category ?? '—'}) · {profile.householdSize}-person household
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#13231D]">GenAI Personal Air Quality Assistant</h1>
          <p className="mt-1 text-sm text-[#4A5D55]">
            Ask practical questions about outdoor safety, commutes, winter smog, indoor air, or sustainable habits.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D4DDD7] bg-white px-3 py-2 text-xs font-medium text-[#546860] hover:bg-[#FDECEC] hover:text-[#B91C1C]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={sending}
            onClick={() => handleSend(q)}
            className="rounded-lg border border-[#DCE3DE] bg-white px-3.5 py-2.5 text-left text-xs font-medium text-[#243831] transition-colors hover:border-[#165B43] hover:bg-[#F3F8F5] disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Conversation Thread */}
      <div className="rounded-xl border border-[#DCE3DE] bg-white">
        <div className="max-h-[540px] space-y-6 overflow-y-auto p-6">
          {loadingHistory ? (
            <p className="text-sm text-[#5E726A]">Loading conversation history...</p>
          ) : messages.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[#165B43]" />
              <h2 className="mt-3 text-base font-semibold text-[#13231D]">
                Context-Aware Environmental Advisor Ready
              </h2>
              <p className="mx-auto mt-1.5 max-w-lg text-sm text-[#546860]">
                Every response evaluates your verified {airData?.standardLabel ?? 'regional'} AQI, weather inversion risk,
                and household preferences—with full reasoning, timing, effort, and data confidence.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={msg.role === 'user' ? 'flex justify-end' : 'space-y-4'}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-2xl rounded-xl bg-[#112A22] px-4 py-3 text-sm text-white">
                    {msg.message}
                  </div>
                ) : (
                  <div className="space-y-4 border-b border-[#EEF2EF] pb-6 last:border-b-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5E726A]">
                      <span className="font-semibold text-[#165B43]">BreatheWise AI Advisor</span>
                      <span>{msg.dataContextUsed || 'Environmental context applied'}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#13231D]">{msg.summary || msg.message}</p>

                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="space-y-3">
                        {msg.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-[#E2E8E4] bg-[#FAFBFA] p-4"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h3 className="text-sm font-semibold text-[#13231D]">
                                {idx + 1}. {rec.recommendedAction}
                              </h3>
                              <span className="font-mono text-xs text-[#165B43]">
                                {rec.relevantTimeOfDay} · {rec.estimatedEffortOrCost}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-[#354941]">
                              <strong className="text-[#13231D]">Why recommended:</strong> {rec.whyRecommended}
                            </p>
                            <div className="mt-2.5 grid grid-cols-1 gap-2 border-t border-[#EAEFEA] pt-2.5 text-xs text-[#4A5D55] sm:grid-cols-3">
                              <div>
                                <span className="block font-medium text-[#13231D]">Expected Benefit</span>
                                <span>{rec.expectedBenefit}</span>
                              </div>
                              <div>
                                <span className="block font-medium text-[#13231D]">Environmental Impact</span>
                                <span>{rec.environmentalImpact}</span>
                              </div>
                              <div>
                                <span className="block font-medium text-[#13231D]">Data Confidence</span>
                                <span>{rec.confidenceIndicator}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-[#6B7E76]">
                        {msg.safetyDisclaimer ||
                          'Environmental lifestyle guidance only; not a substitute for professional medical advice.'}
                      </p>
                      {typeof msg.id === 'number' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[#6B7E76]">Helpful?</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 1)}
                            aria-label="Mark recommendation helpful"
                            className={`rounded p-1.5 transition-colors ${
                              msg.rating === 1 ? 'bg-[#E6F4EE] text-[#165B43]' : 'text-[#6B7E76] hover:bg-[#F2F5F3]'
                            }`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, -1)}
                            aria-label="Mark recommendation unhelpful"
                            className={`rounded p-1.5 transition-colors ${
                              msg.rating === -1 ? 'bg-[#FDECEC] text-[#B91C1C]' : 'text-[#6B7E76] hover:bg-[#F2F5F3]'
                            }`}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="rounded-lg bg-[#F5F8F6] px-4 py-3 text-sm text-[#4A5D55]">
              Analyzing local pollutants, hourly forecast, and your household preferences...
            </div>
          )}

          {errorState && (
            <div role="alert" className="rounded-lg border border-[#F2B5B5] bg-[#FDECEC] p-4 text-sm text-[#991B1B]">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium">{errorState.message}</p>
                  {errorState.officialFallback && (
                    <div className="rounded-md bg-white/80 p-3 text-xs text-[#2D4039]">
                      <p className="font-semibold text-[#13231D]">{errorState.officialFallback.label}</p>
                      <p className="mt-1">General: {errorState.officialFallback.general}</p>
                      <p className="mt-1">Sensitive groups: {errorState.officialFallback.sensitive}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3 border-t border-[#E6ECE8] bg-[#FAFBFA] p-4"
        >
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask BreatheWise AI an air quality question
          </label>
          <input
            id="ai-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask e.g. 'Can my elderly parents walk at 4 PM today?' or 'How do I lower indoor PM2.5 on a budget?'"
            className="flex-1 rounded-lg border border-[#D4DDD7] bg-white px-4 py-2.5 text-sm text-[#13231D] placeholder:text-[#7A8C85] focus:border-[#165B43] focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || input.trim().length < 2}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#165B43] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#114835] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
