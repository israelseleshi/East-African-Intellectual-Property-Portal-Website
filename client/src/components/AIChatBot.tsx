import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, MessageSquare, Loader2, Calendar, ExternalLink, AlertCircle, Clock, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
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
  "Do I have any deadlines this week?",
  "List all deadlines falling in the next 30 days.",
  "What are my most urgent deadlines?",
  "Show me all overdue tasks for this month.",
  "Show me the 5 most recent trademark cases.",
  "Which of my cases are currently Published?"
];

interface TaskStyle {
  bg: string;
  text: string;
  badge: string;
  badgeBorder: string;
  icon: React.ReactNode;
}

const TASK_STYLES: Record<string, TaskStyle> = {
  RENEWAL: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-500', badgeBorder: 'border-red-500', icon: <AlertCircle className="w-3 h-3 text-red-500" /> },
  RENEWAL_NOTICE: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500', badgeBorder: 'border-amber-500', icon: <Clock className="w-3 h-3 text-amber-500" /> },
  CERTIFICATE_ISSUED_ACTION: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', badge: 'bg-blue-500', badgeBorder: 'border-blue-500', icon: <FileText className="w-3 h-3 text-blue-500" /> },
  CERTIFICATE_REQUEST_ACTION: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', badge: 'bg-purple-500', badgeBorder: 'border-purple-500', icon: <FileText className="w-3 h-3 text-purple-500" /> },
  PUBLISHED_ACTION: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', badge: 'bg-green-500', badgeBorder: 'border-green-500', icon: <Calendar className="w-3 h-3 text-green-500" /> },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTaskStyle(task: string) {
  const base = TASK_STYLES[task] || TASK_STYLES.RENEWAL;
  return base;
}

function formatTaskLabel(task: string): string {
  return task
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
      parts: [{ text: "Hello! I'm your EAIP Assistant. I can help you find upcoming deadlines, search for trademarks, or answer questions about your cases. How can I help you today?" }]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [deadlineEntries, setDeadlineEntries] = useState<DeadlineEntry[]>([]);
  const [showDeadlinesModal, setShowDeadlinesModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: message }]
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/ai/chat', {
        message: message,
        history: messages.slice(1)
      });

      const data = response.data;
      
      const aiMessage: Message = {
        role: 'model',
        parts: [{ text: data.text }]
      };

      setMessages(prev => [...prev, aiMessage]);

      const entries = parseDeadlineEntries(data.text);
      if (entries.length > 0) {
        setDeadlineEntries(entries);
        setShowDeadlinesModal(true);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Sorry, I encountered an error: ${errorMessage}. Please try again later.` }]
      }]);
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
          <div key={`btn-${i}`} className="my-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all gap-1"
              onClick={() => {
                setIsOpen(false);
                navigate(`/trademarks/${uuid}`);
              }}
            >
              View Case Details
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

    return (
      <div className="flex flex-col gap-1">
        {elements}
      </div>
    );
  };

  return (
    <>
      <Dialog open={showDeadlinesModal} onOpenChange={setShowDeadlinesModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="bg-primary px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold tracking-tight">Deadline Results</DialogTitle>
                <p className="text-white/60 text-xs mt-0.5">
                  {deadlineEntries.length} deadline{deadlineEntries.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-80px)] bg-[#F8F7F4]">
            <div className="p-5">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border/40">
                {Array.from(new Set(deadlineEntries.map(e => e.task))).map((task) => {
                  const count = deadlineEntries.filter(e => e.task === task).length;
                  const style = getTaskStyle(task);
                  return (
                    <div key={task} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium", style.bg, style.text)}>
                      {style.icon}
                      <span>{formatTaskLabel(task)}</span>
                      <span className={cn("ml-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border", style.badgeBorder, style.bg)}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Deadline table */}
              <div className="space-y-2">
                {deadlineEntries.map((entry, idx) => {
                  const style = getTaskStyle(entry.task);
                  const isOverdue = new Date(entry.due) < new Date();
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                      key={entry.id}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border/30 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer",
                        isOverdue && "border-l-2 border-l-red-400"
                      )}
                      onClick={() => {
                        setShowDeadlinesModal(false);
                        setIsOpen(false);
                        navigate(`/trademarks/${entry.id}`);
                      }}
                    >
                      {/* Task badge */}
                      <div className={cn("flex-shrink-0 w-20 flex items-center justify-center px-2 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wider", style.bg, style.text, style.badgeBorder)}>
                        {entry.task === 'RENEWAL' ? 'Renew' :
                         entry.task === 'RENEWAL_NOTICE' ? 'Notice' :
                         entry.task === 'CERTIFICATE_ISSUED_ACTION' ? 'Issue' :
                         entry.task === 'CERTIFICATE_REQUEST_ACTION' ? 'Request' :
                         entry.task === 'PUBLISHED_ACTION' ? 'Publish' : 'Action'}
                      </div>

                      {/* Mark name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate leading-tight">{entry.mark}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatTaskLabel(entry.task)}</p>
                      </div>

                      {/* Due date */}
                      <div className="flex-shrink-0 text-right">
                        <p className={cn(
                          "text-xs font-semibold leading-tight",
                          isOverdue ? "text-red-600" : "text-primary"
                        )}>
                          {formatDate(entry.due)}
                        </p>
                        <p className={cn(
                          "text-[9px] mt-0.5 font-medium uppercase tracking-wider",
                          isOverdue ? "text-red-400" : "text-muted-foreground"
                        )}>
                          {isOverdue ? 'Overdue' : 'Due date'}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:bg-primary group-hover:text-white">
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
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
              className="mb-4 w-[350px] sm:w-[400px] h-[500px] shadow-2xl overflow-hidden flex flex-col"
            >
              <Card className="flex flex-col h-full border-none shadow-none rounded-2xl overflow-hidden">
                <CardHeader className="bg-primary py-4 px-6 flex flex-row items-center justify-between text-primary-foreground">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                      <Bot size={20} className="text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">EAIP Assistant</CardTitle>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] text-primary-foreground/70 font-medium">Online</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsOpen(false)}
                    className="text-primary-foreground hover:bg-white/10 -mr-2"
                  >
                    <X size={20} />
                  </Button>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden bg-muted/30">
                  <ScrollArea className="h-full p-4">
                    <div className="flex flex-col gap-4">
                      {messages.map((msg, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "flex flex-col max-w-[85%] gap-1",
                            msg.role === 'user' ? "ml-auto items-end" : "items-start"
                          )}
                        >
                            <div 
                              className={cn(
                                "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                                msg.role === 'user' 
                                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                                  : "bg-white text-foreground shadow-sm rounded-tl-none border border-border/40"
                              )}
                            >
                              {msg.role === 'model' ? renderMessageText(msg.parts[0].text) : msg.parts[0].text}
                            </div>
                          <span className="text-[10px] text-muted-foreground px-1 font-medium uppercase tracking-wider">
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex flex-col items-start gap-1 max-w-[85%]">
                          <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-border/40">
                            <div className="flex gap-1">
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                            </div>
                          </div>
                        </div>
                      )}
                      {messages.length <= 1 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {QUICK_QUESTIONS.map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                setMessage(q);
                              }}
                              className="text-xs bg-white border border-primary/20 hover:bg-primary/5 text-primary px-3 py-1.5 rounded-full transition-colors shadow-sm"
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

                <CardFooter className="p-4 bg-white border-t">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex w-full gap-2 items-center"
                  >
                    <Input 
                      placeholder="Ask about your deadlines..." 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isLoading}
                      className="flex-1 rounded-xl border-muted focus-visible:ring-primary h-10 px-4"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isLoading || !message.trim()}
                      className="rounded-xl h-10 w-10 shrink-0"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
            isOpen ? "bg-white text-primary rotate-90" : "bg-primary text-primary-foreground hover:shadow-primary/20"
          )}
        >
          {isOpen ? <X size={28} /> : (
            <div className="relative">
              <MessageSquare size={28} />
            </div>
          )}
        </motion.button>
      </div>
    </>
  );
}
