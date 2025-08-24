import { z } from 'zod'

 
export const roleSchema = z.enum(['user', 'assistant', 'tool'])

export const contentSchema = z.any();

 
export const createChatInputSchema = z.object({
  title: z.string().optional(),
})

export const appendMessageInputSchema = z.object({
  chatId: z.string().uuid(),
  role: roleSchema,
  content: contentSchema,
})

 
export const chatDTOSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.date(),
  messageCount: z.number().int().min(0),
})

export const messageDTOSchema = z.object({
  id: z.string().uuid(),
  role: roleSchema,
  content: contentSchema,
  createdAt: z.date(),
})

export const chatWithMessagesDTOSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.date(),
  messages: z.array(messageDTOSchema),
  error: z.string().optional(),

})
 
export const weatherToolOutputSchema = z.object({
  location: z.string(),
  tempC: z.number(),
  description: z.string(),
  icon: z.string(),
  humidity: z.number(),
  windKph: z.number(),
  error: z.string().optional(),

})

export const f1MatchesToolOutputSchema = z.object({
  season: z.string(),
  round: z.number().int().min(1),
  raceName: z.string(),
  circuit: z.string(),
  country: z.string(),
  date: z.string(),
  time: z.string().optional(),
  error: z.string().optional(),

})

export const stockPriceToolOutputSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  error: z.string().optional(),

})

 
 
export type CreateChatInput = z.infer<typeof createChatInputSchema>
export type AppendMessageInput = z.infer<typeof appendMessageInputSchema>
export type ChatDTO = z.infer<typeof chatDTOSchema>
export type MessageDTO = z.infer<typeof messageDTOSchema>
export type ChatWithMessagesDTO = z.infer<typeof chatWithMessagesDTOSchema>
export type WeatherToolOutput = z.infer<typeof weatherToolOutputSchema>
export type F1MatchesToolOutput = z.infer<typeof f1MatchesToolOutputSchema>
export type StockPriceToolOutput = z.infer<typeof stockPriceToolOutputSchema> 
