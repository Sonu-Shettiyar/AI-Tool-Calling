"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { chats, messages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createChatInputSchema,
  type CreateChatInput,
  type AppendMessageInput,
  type ChatDTO,
  type MessageDTO,
  type ChatWithMessagesDTO,
} from "./schemas";

 
async function getCurrentUserId(): Promise<string> {
 
  const session = await getServerSession(authOptions) as { user?: { id: string } } | null;
  
  
  if (!session?.user?.id) {
     
    throw new Error("Unauthorized: User not authenticated");
  }
  
 
  return session.user.id;
}

 
export async function createChat(input: CreateChatInput): Promise<ChatDTO> {
  
  const userId = await getCurrentUserId();
  const validatedInput = createChatInputSchema.parse(input);
   
  
  const title = validatedInput.title || `Chat ${new Date().toLocaleTimeString()}`;
  
  
  try {
    const [newChat] = await db
      .insert(chats)
      .values({
        userId,
        title,
      })
      .returning();
     
    
    const result = {
      id: newChat.id,
      title: newChat.title,
      createdAt: newChat.createdAt,
      messageCount: 0,
    };
     
    return result;
  } catch (error) {
    console.error("createChat: Database insert failed:", error);
    throw error;
  }
}
 
export async function listChats(): Promise<ChatDTO[]> {
  
  const userId = await getCurrentUserId();
  
  try {
    const userChats = await db
      .select({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
      })
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.createdAt));
    
    const chatsWithCounts = await Promise.all(
      userChats.map(async (chat) => {
        const messageCount = await db
          .select({ count: messages.id })
          .from(messages)
          .where(eq(messages.chatId, chat.id));
        
        return {
          ...chat,
          messageCount: messageCount.length,
        };
      })
    );

    return chatsWithCounts;
  } catch (error) {
    console.error("listChats: Database query failed:", error);
    if (error instanceof Error) {
      console.error("listChats: Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}
 
export async function getChat(id: string): Promise<ChatWithMessagesDTO> {
  const userId = await getCurrentUserId();
  
  const [chat] = await db
    .select()
    .from(chats)
    .where(eq(chats.id, id))
    .limit(1);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (chat.userId != userId) {
    throw new Error("Unauthorized: Access denied to this chat");
  }

  const chatMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(messages.createdAt);

  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    messages: chatMessages.map(msg => ({
      ...msg,
      content: msg.content as Record<string, unknown>
    })),
  };
}
 
export async function appendMessage(input: AppendMessageInput): Promise<MessageDTO> {
  const userId = await getCurrentUserId();
  
  let messageInput = input;
  if (Array.isArray(input)) {
    messageInput = input[0];
  }
  
  const validatedInput = messageInput;
  
  const [chat] = await db
    .select()
    .from(chats)
    .where(eq(chats.id, input.chatId))
    .limit(1);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (chat.userId != userId) {
    throw new Error("Unauthorized: Access denied to this chat");
  }

  const [newMessage] = await db
    .insert(messages)
    .values({
      chatId: validatedInput.chatId,
      role: validatedInput.role,
      content: validatedInput.content,
    })
    .returning();

  revalidatePath(`/chat/${validatedInput.chatId}`);
  revalidatePath("/chat");
  
  return {
    id: newMessage.id,
    role: newMessage.role,
    content: newMessage.content as Record<string, unknown>,
    createdAt: newMessage.createdAt,
  };
}
