import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  X,
  MessageSquare,
  Loader2,
  Calendar,
  ExternalLink,
  AlertCircle,
  Clock,
  FileText,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Typography } from './ui/typography';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { apiClient } from '@/api/httpClient';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface DeadlineEntry {
  mark: string;
  task: string;
  due: string;
  id: string;
}

const QUICK_QUESTIONS = [
  'Do I have any deadlines this week?',
  'List all deadlines falling in the next 30 days.',
  'What are my most urgent deadlines?',
  'Show me all overdue tasks for this month.',
  'Show me the 5 most recent trademark cases.',
  'Which of my cases are currently Published?',
];

interface TaskStyle {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
  iconBg: string;
}

const TASK_STYLES: Record<string, TaskStyle> = {
  RENEWAL: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: <AlertCircle className="w-4 h-4 text-red-500" />,
    iconBg: 'bg-red-100',
  },
  RENEWAL_NOTICE: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Clock className="w-4 h-4 text-amber-500" />,
    iconBg: 'bg-amber-100',
  },
  CERTIFICATE_ISSUED_ACTION: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: <FileText className="w-4 h-4 text-blue-500" />,
    iconBg: 'bg-blue-100',
  },
  CERTIFICATE_REQUEST_ACTION: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: <FileText className="w-4 h-4 text-purple-500" />,
    iconBg: 'bg-purple-100',
  },
  PUBLISHED_ACTION: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <Calendar className="w-4 h-4 text-emerald-500" />,
    iconBg: 'bg-emerald-100',
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTaskStyle(task: string): TaskStyle {
  return TASK_STYLES[task] || TASK_STYLES.RENEWAL;
}

function formatTaskLabel(task: string): string {
  return task
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTaskShortLabel(task: string): string {
  switch (task) {
    case 'RENEWAL': return 'Renew';
    case 'RENEWAL_NOTICE': return 'Notice';
    case 'CERTIFICATE_ISSUED_ACTION': return 'Issue';
    case 'CERTIFICATE_REQUEST_ACTION': return 'Request';
    case 'PUBLISHED_ACTION': return 'Publish';
    default: return 'Action';
  }
}

function parseDeadlineEntries(text: string): DeadlineEntry[] {
  const regex = /- Mark:\s*(.+?)\s*\|\s*Task:\s*(.+?)\s*\|\s*Due:\s*(.+?)\s*\|\s*ID:\s*([a-f0-9-]{36})/gi;
  const entries: DeadlineEntry[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    entries.push({
      mark: match[1].trim(),
      task: match[2].trim(),
      due: match[3].trim(),
      id: match[4].trim(),
    });
  }
  return entries;
}

export default function AIChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [
        {
          text: "Hello! I'm your EAIP Assistant. I can help you find upcoming deadlines, search for trademarks, or answer questions about your cases. How can I help you today?",
        },
      ],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [deadlineEntries, setDeadlineEntries] = useState<DeadlineEntry[]>([]);
  const [showDeadlinesModal, setShowDeadlinesModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: message }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/ai/chat', {
        message: message,
        history: messages.slice(1),
      });

      const data = response.data;

      const aiMessage: Message = {
        role: 'model',
        parts: [{ text: data.text }],
      };

      setMessages((prev) => [...prev, aiMessage]);

      const entries = parseDeadlineEntries(data.text);
      if (entries.length > 0) {
        setDeadlineEntries(entries);
        setShowDeadlinesModal(true);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          parts: [
            { text: `Sorry, I encountered an error: ${errorMessage}. Please try again later.` },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageText = (text: string) => {
    const idRegex = /\[ID:\s*([a-f0-9-]{36})\]/gi;
    const parts = text.split(idRegex);

    if (parts.length === 1) return <span>{text}</span>;

    const elements: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        const uuid = parts[i];
        elements.push(
          <div key={`btn-${i}`} className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs bg-white border-primary/20 text-primary hover:bg-primary hover:text-white transition-all gap-2 rounded-xl font-semibold"
              onClick={() => {
                setIsOpen(false);
                navigate(`/trademarks/${uuid}`);
              }}
            >
              View Case Details
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      } else {
        const content = parts[i].trim();
        if (content) {
          elements.push(<span key={`text-${i}`}>{content}</span>);
        }
      }
    }

    return <div className="flex flex-col gap-1">{elements}</div>;
  };

  return (
    <>
      <Dialog open={showDeadlinesModal} onOpenChange={setShowDeadlinesModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl z-[110]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1A1A1A] to-[#404040] text-white px-10 py-8">
            <div className="absolute -top-10 -right-10 p-4 opacity-[0.07] rotate-12 pointer-events-none">
              <Calendar size={180} strokeWidth={1.5} />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner">
                  <Calendar size={28} className="text-primary" strokeWidth={2.5} />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight text-white">
                    Deadline Results
                  </DialogTitle>
                  <p className="text-white/60 text-xs mt-1 font-bold tracking-widest uppercase">
                    {deadlineEntries.length} deadline
                    {deadlineEntries.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold tracking-widest uppercase">
                Registry Match
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-160px)] bg-[#F8F9FA]">
            <div className="p-8 space-y-6">
              <div className="flex flex-wrap gap-2 pb-5 border-b border-border/40">
                {Array.from(new Set(deadlineEntries.map((e) => e.task))).map((task) => {
                  const count = deadlineEntries.filter((e) => e.task === task).length;
                  const style = getTaskStyle(task);
                  return (
                    <div
                      key={task}
                      className={cn(
                        'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold tracking-wide',
                        style.bg,
                        style.text,
                        style.border
                      )}
                    >
                      <div className={cn('h-5 w-5 rounded-md flex items-center justify-center', style.iconBg)}>
                        {style.icon}
                      </div>
                      <span>{formatTaskLabel(task)}</span>
                      <span
                        className={cn(
                          'ml-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border bg-white',
                          style.border
                        )}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardContent className="p-3">
                  <div className="space-y-1.5">
                    {deadlineEntries.map((entry, idx) => {
                      const style = getTaskStyle(entry.task);
                      const isOverdue = new Date(entry.due) < new Date();
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                          className={cn(
                            'group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-pointer',
                            isOverdue && 'bg-red-50/40'
                          )}
                          onClick={() => {
                            setShowDeadlinesModal(false);
                            setIsOpen(false);
                            navigate(`/trademarks/${entry.id}`);
                          }}
                        >
                          <div
                            className={cn(
                              'size-12 rounded-xl flex items-center justify-center shrink-0 border',
                              style.iconBg,
                              style.border
                            )}
                          >
                            {style.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border',
                                  style.bg,
                                  style.text,
                                  style.border
                                )}
                              >
                                {getTaskShortLabel(entry.task)}
                              </span>
                              <Typography.small className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider truncate">
                                {formatTaskLabel(entry.task)}
                              </Typography.small>
                            </div>
                            <Typography.small className="font-semibold leading-tight truncate block text-primary">
                              {entry.mark}
                            </Typography.small>
                          </div>

                          <div className="shrink-0 text-right">
                            <Typography.small
                              className={cn(
                                'text-sm font-bold leading-tight block',
                                isOverdue ? 'text-red-600' : 'text-primary'
                              )}
                            >
                              {formatDate(entry.due)}
                            </Typography.small>
                            <Typography.small
                              className={cn(
                                'text-[9px] mt-0.5 font-bold uppercase tracking-widest block',
                                isOverdue ? 'text-red-400' : 'text-muted-foreground/70'
                              )}
                            >
                              {isOverdue ? 'Overdue' : 'Due date'}
                            </Typography.small>
                          </div>

                          <div className="shrink-0 w-9 h-9 rounded-xl bg-muted/30 group-hover:bg-primary group-hover:text-white flex items-center justify-center text-muted-foreground transition-all duration-200">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="p-6 border-t border-border/50 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Click any row to open the case file</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowDeadlinesModal(false)}
              className="h-10 px-5 rounded-xl font-bold text-sm hover:bg-muted/30"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="mb-4 w-[350px] sm:w-[400px] h-[560px] shadow-2xl overflow-hidden flex flex-col"
            >
              <Card className="flex flex-col h-full border-none shadow-none rounded-3xl overflow-hidden bg-white/95 backdrop-blur-xl">
                <CardHeader className="relative overflow-hidden bg-gradient-to-br from-[#1A1A1A] to-[#404040] text-white py-5 px-6 flex flex-row items-center justify-between border-none">
                  <div className="absolute -top-6 -right-6 p-2 opacity-[0.07] rotate-12 pointer-events-none">
                    <Bot size={120} strokeWidth={1.5} />
                  </div>
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner">
                      <Bot size={22} className="text-primary" strokeWidth={2.5} />
                    </div>
                    <div>
                      <Typography.h4a className="text-white font-bold tracking-tight">
                        EAIP Assistant
                      </Typography.h4a>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-white/70 font-bold tracking-widest uppercase">
                          Online
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="relative z-10 text-white hover:bg-white/10 rounded-xl h-10 w-10"
                  >
                    <X size={20} />
                  </Button>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden bg-[#F8F9FA]">
                  <ScrollArea className="h-full p-5">
                    <div className="flex flex-col gap-4">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex flex-col max-w-[88%] gap-1.5',
                            msg.role === 'user' ? 'ml-auto items-end' : 'items-start'
                          )}
                        >
                          <div
                            className={cn(
                              'px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm',
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-tr-md font-medium'
                                : 'bg-white text-foreground rounded-tl-md border border-border/40'
                            )}
                          >
                            {msg.role === 'model'
                              ? renderMessageText(msg.parts[0].text)
                              : msg.parts[0].text}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1.5 font-bold uppercase tracking-widest">
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex flex-col items-start gap-1.5 max-w-[88%]">
                          <div className="bg-white px-4 py-3.5 rounded-2xl rounded-tl-md shadow-sm border border-border/40">
                            <div className="flex gap-1.5">
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                                className="w-1.5 h-1.5 bg-primary/50 rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                className="w-1.5 h-1.5 bg-primary/50 rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                className="w-1.5 h-1.5 bg-primary/50 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {messages.length <= 1 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {QUICK_QUESTIONS.map((q) => (
                            <button
                              key={q}
                              onClick={() => setMessage(q)}
                              className="text-xs bg-white border border-primary/15 hover:border-primary/30 hover:bg-primary/5 text-primary px-3.5 py-2 rounded-full transition-all shadow-sm font-semibold"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                      <div ref={scrollRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                <CardFooter className="p-4 bg-white border-t border-border/40">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex w-full gap-2 items-center"
                  >
                    <Input
                      placeholder="Ask about your deadlines..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isLoading}
                      className="flex-1 rounded-xl bg-muted/30 border-none h-11 px-4 focus-visible:ring-primary/20 font-medium"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || !message.trim()}
                      className="rounded-xl h-11 w-11 shrink-0 shadow-sm hover:shadow-md transition-all"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300',
            isOpen
              ? 'bg-white text-primary rotate-90 border border-border/40'
              : 'bg-primary text-primary-foreground hover:shadow-primary/30'
          )}
        >
          {isOpen ? <X size={26} strokeWidth={2.5} /> : <MessageSquare size={26} strokeWidth={2.5} />}
        </motion.button>
      </div>
    </>
  );
}
