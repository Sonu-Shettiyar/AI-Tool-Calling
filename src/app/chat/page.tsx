import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listChats, getChat } from "@/lib/chatHelpers";
import { MessageDTO, ChatDTO } from "@/lib/schemas";

import ChatPanel from "@/components/ChatPanel";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

interface ChatPageProps {
  searchParams: { chat?: string };
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;


  const session = await getServerSession(authOptions) as any;


  if (!session?.user?.id) {
    redirect("/?unauthenticated=true");

  }



  let chats: ChatDTO[] = [];
  try {
    chats = await listChats();
  } catch (error) {
    console.error("ChatPage: Failed to load chats:", error);
    chats = [];
  }

  let selectedChatId: string | null = null;
  let selectedChatMessages: MessageDTO[] = [];
  let isNewChat = false;

  if (params.chat) {
    try {
      const chat = await getChat(params.chat);
    
      selectedChatId = chat.id;
      selectedChatMessages = chat.messages || [];
    } catch (error) {
      console.error("ChatPage: Failed to load chat:", error);
    }
  }
 
  if (!selectedChatId) { 
    isNewChat = true;
  }

  

  return (
    <Providers>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <ChatPanel
          initialChats={chats}
          selectedChatId={selectedChatId}
          initialMessages={selectedChatMessages}
          isNewChat={isNewChat}
        />
      </div>
    </Providers>
  );
}
