"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/chatHelpers";
  
import ChatSkeleton from "./ChatSkeleton";
import toast from "react-hot-toast";
import { ChatDTO, WeatherToolOutput, F1MatchesToolOutput, StockPriceToolOutput } from "@/lib/schemas";

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
   
  const [streamingContent, setStreamingContent] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

 
 

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize component
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000); // Show skeleton for 1 second

    return () => clearTimeout(timer);
  }, []);

  // Hydrate messages from SSR
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
      const newChat = await createChat({ title: "New Chat" });
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
    setMessages([]); // Clear current messages
    
    try {
      const response = await fetch(`/api/chat/${chatId}/messages`);
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
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-200 ease-in-out lg:transition-none`}>
        <div className="w-80 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chats</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={createNewChat}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Chat
            </button>
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
              <div className="space-y-2">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      selectChat(chat.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentChatId === chat.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium truncate">{chat.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(chat.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
   
      </div>
    </div>
  );
}
