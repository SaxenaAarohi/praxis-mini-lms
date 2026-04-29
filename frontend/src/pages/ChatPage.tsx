import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, User as UserIcon } from 'lucide-react';
import { api, extractError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/utils/cn';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const STARTERS = [
  'Explain useEffect like I am a backend dev',
  'When should I embed vs reference in MongoDB?',
  'Walk me through closures with a simple example',
  'How do I improve my short-answer grading score?',
];

export function ChatPage(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput('');
    setSending(true);

    try {
      const { reply } = await api.ai.chat(next);
      setMessages([...next, { role: 'model', content: reply }]);
    } catch (err) {
      toast.error('Chat failed', extractError(err).message);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-600" />
          AI Tutor
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Ask any concept question — the assistant is here to help you study.
        </p>
      </div>

      <div className="card flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="font-semibold text-lg">How can I help today?</h2>
              <p className="text-sm text-slate-600 max-w-md">
                Pick a starter or type your own question.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mt-3 w-full max-w-2xl">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-left text-sm rounded-xl border border-slate-200 px-3 py-2.5 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-900',
                )}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="rounded-2xl px-4 py-3 text-sm bg-slate-100 text-slate-500 italic">
                <span className="inline-flex gap-1 items-center">
                  Thinking
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        <form
          className="border-t border-slate-200 p-3 flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            rows={1}
            className="flex-1 min-h-[44px] resize-none"
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <Button type="submit" loading={sending} icon={<Send className="w-4 h-4" />}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
