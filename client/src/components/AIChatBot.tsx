import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/httpClient';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: "Hello! I'm your EAIP Assistant. I can help you find upcoming deadlines, search for trademarks, or answer questions about your cases. How can I help you today?" }]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
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
        history: messages.slice(1) // Exclude initial greeting for Gemini history
      });

      const data = response.data;
      
      const aiMessage: Message = {
        role: 'model',
        parts: [{ text: data.text }]
      };

      setMessages(prev => [...prev, aiMessage]);
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

  return (
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
                          {msg.parts[0].text}
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
  );
}
