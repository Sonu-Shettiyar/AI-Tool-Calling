"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createChat, appendMessage } from "@/lib/chatHelpers";
import { WeatherCard, RaceCard, PriceCard } from "@/components";

import ChatSkeleton from "./ChatSkeleton";
import toast from "react-hot-toast";
import { ChatDTO, WeatherToolOutput, F1MatchesToolOutput, StockPriceToolOutput } from "@/lib/schemas";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface ChatPanelProps {
  initialChats: ChatDTO[];
  selectedChatId: string | null;
  initialMessages: Array<{
    id: string;
    role: "user" | "assistant" | "tool";
    content: Record<string, unknown>;
    createdAt: Date;
  }>;
  isNewChat: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string | WeatherToolOutput | F1MatchesToolOutput | StockPriceToolOutput;
  toolKind?: 'weather' | 'f1' | 'stock';
  timestamp: Date;
}

export default function ChatPanel({ initialChats, selectedChatId, initialMessages, isNewChat }: ChatPanelProps) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatDTO[]>(initialChats);
  const [currentChatId, setCurrentChatId] = useState<string | null>(selectedChatId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const SUMMARY_CONFIG = {
    maxRecentMessages: 5,
    enableSummary: true,
    minMessagesForSummary: 8,
  };

  // System prompt configuration to define AI behavior and boundaries
  const SYSTEM_PROMPT = `You are a helpful AI assistant with access to real-time tools. You can:

1. Get current weather information for any location using the getWeather tool
2. Get Formula 1 race schedules and information using the getF1Matches tool  
3. Get current stock prices using the getStockPrice tool

When users ask about weather, F1 races, or stock prices, ALWAYS use the appropriate tool first, then provide a helpful response based on the tool results.

For weather questions: Use getWeather tool, then describe the current conditions
For F1 questions: Use getF1Matches tool, then explain the race information
For stock questions: Use getStockPrice tool, then analyze the price data

Be conversational and helpful in your responses.`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialMessages.length > 0 && selectedChatId) {
      const hydratedMessages: ChatMessage[] = initialMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content :
          (msg.content.text as string) || JSON.stringify(msg.content),
        toolKind: msg.content.toolKind as 'weather' | 'f1' | 'stock' | undefined,
        timestamp: new Date(msg.createdAt)
      }));
      setMessages(hydratedMessages);
    }
  }, [initialMessages, selectedChatId]);

  useEffect(() => {
    if (isNewChat && selectedChatId && currentChatId !== selectedChatId) {
      router.replace(`/chat?chat=${selectedChatId}`);
    }
  }, [isNewChat, selectedChatId, currentChatId, router]);

  const createNewChat = async () => {
    try {
      const newChat = await createChat({});
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      setMessages([]);

      router.push(`/chat?chat=${newChat.id}`);
      toast.success("New chat created!");
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create new chat. Please try again.");
    }
  };

  const selectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    setMessages([]);
    try {
      const response = await fetch(`/api/chat/${chatId}/messages`);
      console.log(response, 'response')
      if (response.ok) {
        const chatMessages = await response.json();
        const hydratedMessages: ChatMessage[] = chatMessages.map((msg: {
          id: string;
          role: "user" | "assistant" | "tool";
          content: Record<string, unknown>;
          createdAt: string;
        }) => ({
          id: msg.id,
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content :
            (msg.content.text as string) || JSON.stringify(msg.content),
          toolKind: msg.content.toolKind as 'weather' | 'f1' | 'stock' | undefined,
          timestamp: new Date(msg.createdAt)
        }));
        setMessages(hydratedMessages);
        if (hydratedMessages.length > 0) {
          toast.success(`Loaded ${hydratedMessages.length} messages`);
        }
      } else {
        toast.error("Failed to load chat messages");
      }
    } catch (error) {
      console.error("Failed to load chat messages:", error);
      toast.error("Failed to load chat messages. Please try again.");
    }

    router.push(`/chat?chat=${chatId}`);
  };

  const generateConversationSummary = (messages: ChatMessage[]): string => {
    if (!SUMMARY_CONFIG.enableSummary || messages.length <= SUMMARY_CONFIG.minMessagesForSummary) {
      return "";
    }

    const olderMessages = messages.slice(0, -SUMMARY_CONFIG.maxRecentMessages);
    const userMessages = olderMessages.filter(msg => msg.role === 'user');

    if (userMessages.length === 0) {
      return "";
    }

    const topics = userMessages.map(msg => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return content.toLowerCase();
    });

    const themes: string[] = [];
    if (topics.some(topic => topic.includes('weather') || topic.includes('temperature') || topic.includes('humidity') || topic.includes('forecast'))) {
      themes.push('weather information');
    }
    if (topics.some(topic => topic.includes('f1') || topic.includes('race') || topic.includes('circuit') || topic.includes('formula') || topic.includes('grand prix'))) {
      themes.push('Formula 1 racing');
    }
    if (topics.some(topic => topic.includes('stock') || topic.includes('price') || topic.includes('market') || topic.includes('trading') || topic.includes('investment'))) {
      themes.push('stock market data');
    }
    if (topics.some(topic => topic.includes('general') || topic.includes('help') || topic.includes('question') || topic.includes('explain') || topic.includes('what is'))) {
      themes.push('general questions');
    }

    if (themes.length === 0) {
      themes.push('various topics');
    }

    const summary = `Previous conversation covered: ${themes.join(', ')}. The user has asked ${userMessages.length} questions about these topics.`;
    return summary;
  };

  const prepareMessagesForAPI = (messages: ChatMessage[], newUserMessage: string) => {
    const recentMessages = messages.slice(-SUMMARY_CONFIG.maxRecentMessages);
    const summary = generateConversationSummary(messages);

    const apiMessages = [];

    apiMessages.push({
      role: 'system' as const,
      content: SYSTEM_PROMPT
    });

    if (summary) {
      apiMessages.push({
        role: 'user' as const,
        content: `[Previous conversation context: ${summary}]`
      });
    }

    apiMessages.push(...recentMessages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    })));

    apiMessages.push({ role: 'user' as const, content: newUserMessage });

    return apiMessages;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentChatId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const originalInput = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const apiMessages = prepareMessagesForAPI(messages, originalInput);

      const systemMessages = apiMessages.filter(msg => msg.role === 'system');
      const hasSystemPrompt = systemMessages.some(msg => !msg.content.startsWith('[Previous conversation context:'));
      const hasSummary = apiMessages.some(msg => msg.role === 'user' && msg.content.startsWith('[Previous conversation context:'));
      const recentMessagesCount = apiMessages.filter(msg => msg.role !== 'system' && !msg.content.startsWith('[Previous conversation context:')).length - 1;

      if (hasSystemPrompt && hasSummary) {
        toast.success(`Using system prompt + conversation summary + ${recentMessagesCount} recent messages`);
      } else if (hasSystemPrompt) {
        toast.success(`Using system prompt + ${recentMessagesCount} recent messages`);
      } else if (hasSummary) {
        toast.success(`Using conversation summary + ${recentMessagesCount} recent messages`);
      } else {
        toast.success(`Using ${recentMessagesCount} recent messages`);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const rateLimitData = await response.json();
          throw new Error(`Rate limit exceeded. Please wait ${rateLimitData.retryAfter} seconds before trying again.`);
        } else if (response.status === 401) {
          throw new Error("Authentication required. Please sign in again.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      let fullContent = "";
      let toolResults: Array<{
        type: 'weather' | 'f1' | 'stock';
        data: any;
      }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text-delta') {
                fullContent += data.delta;
                setStreamingContent(fullContent);
              } else if (data.type === 'tool-result') {
                console.log('Received tool result:', data.toolType, data.data);
                toolResults.push({
                  type: data.toolType,
                  data: data.data
                });

                // Immediately add the tool result as a message
                const toolMessage: ChatMessage = {
                  id: `tool-${Date.now()}-${Math.random()}`,
                  role: 'tool',
                  content: data.data,
                  toolKind: data.toolType,
                  timestamp: new Date()
                };

                setMessages(prev => [...prev, toolMessage]);
              } else if (data.type === 'done') {
                console.log('Stream complete, final tool results:', data.toolResults);
              }
            } catch (error) {
              console.log('Skip invalid JSON lines:', error)
            }
          }
        }
      }

      // Add the assistant's response
      if (fullContent.trim()) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: fullContent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      setStreamingContent("");

      // Persist messages
      try {
        await appendMessage({
          chatId: currentChatId,
          role: 'user',
          content: { text: originalInput }
        });

        if (fullContent.trim()) {
          await appendMessage({
            chatId: currentChatId,
            role: 'assistant',
            content: { text: fullContent }
          });
        }

        // Persist tool results
        for (const toolResult of toolResults) {
          await appendMessage({
            chatId: currentChatId,
            role: 'tool',
            content: {
              toolKind: toolResult.type,
              data: toolResult.data
            }
          });
        }

        toast.success("Messages saved successfully");
      } catch (error) {
        console.error("Failed to persist messages:", error);
        toast.error("Failed to save messages. Your conversation may not be preserved.");
      }

    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(errorMessage);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.role === 'tool' && message.toolKind) {
      console.log('Rendering tool message:', message.toolKind, message);
      switch (message.toolKind) {
        case 'weather':
          return <WeatherCard weather={message.content as WeatherToolOutput} />;
        case 'f1':
          return <RaceCard race={message.content as F1MatchesToolOutput} />;
        case 'stock':
          return <PriceCard stock={message.content as StockPriceToolOutput} />;
        default:
          return <div className="text-gray-600">
            Tool result received: {JSON.stringify(message.content)}
          </div>;
      }
    }

    return (
      <div className="text-gray-800 dark:text-gray-200">
        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
      </div>
    );
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isInitializing) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out lg:transition-none`}>
        <div className="w-80 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chats</h2>
            <Button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Button
              onClick={createNewChat}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {chats.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Start your first conversation by clicking the &quot;New Chat&quot; button above.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {chats.map((chat) => (
                  <li
                    key={chat.id}
                    onClick={() => {
                      selectChat(chat.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${currentChatId === chat.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <div className="font-medium truncate">{chat.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(chat.createdAt).toDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentChatId ? 'Chat' : 'Select a chat or start a new one'}
            </h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentChatId ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Select a chat</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Choose a conversation from the sidebar or create a new one to get started.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Start a conversation</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Type your message below to begin chatting with the AI assistant.
              </p>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                You can ask about  F1 races, stock prices, or weather!
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-3xl rounded-lg p-4 ${message.role === 'user'
                    ? 'bg-blue-400 text-white'
                    : message.role === 'tool'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                >
                  {renderMessage(message)}
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-lg p-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <div className="text-gray-800 dark:text-gray-200">
                  {streamingContent}
                  <span className="animate-pulse">▋</span>
                </div>
                <div className="text-xs opacity-70 mt-2">
                  {new Date().toTimeString()}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          {

            currentChatId ?
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={currentChatId ? "Type your message..." : 'Select a chat to start messaging'}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  disabled={isLoading || !currentChatId}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim() || !currentChatId}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send</span>
                  )}
                </Button>
              </div> :
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Button
                  onClick={createNewChat}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Chat
                </Button>
              </div>
          }
          {isLoading && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              Processing your message...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
