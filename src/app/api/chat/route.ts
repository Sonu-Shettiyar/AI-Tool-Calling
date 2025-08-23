import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchWeather, fetchNextF1, fetchStock } from '@/lib/tools';
import { defaultRateLimiter } from '@/lib/rateLimit';

const chatInputSchema = z.object({
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
  })),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user?: { id: string } } | null;
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

   const rateLimitResult = await defaultRateLimiter.checkLimit(session.user.id);
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.resetTime).toISOString();
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          resetTime,
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': resetTime,
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          } 
        }
      );
    }

    const body = await req.json();
    
    const { messages } = chatInputSchema.parse(body);

    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role !== 'user') {
      return new Response('Last message must be from user', { status: 400 });
    }

    const model = google('gemini-1.5-flash');


 
    const conversation = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
 
    const enhancedSystemPrompt = {
      role: 'system' as const,
      content: `You are a helpful AI assistant with access to real-time tools. You MUST follow these rules:

1. ALWAYS use tools when asked about weather, F1 races, or stock prices
2. NEVER respond to these topics without using the appropriate tool first
3. After using a tool, provide a helpful, conversational response based on the tool results
4. Ask follow-up questions to engage the user and provide more value
5. Be conversational, friendly, and helpful

Available tools:
- getWeather: For weather information (temperature, humidity, wind, conditions)
- getF1Matches: For Formula 1 race schedules and information  
- getStockPrice: For current stock prices and market data

Example: If someone asks "What's the weather in London?", you MUST call getWeather("London") first, then respond with the data and ask follow-up questions like "Would you like to know the forecast for tomorrow?" or "Is there anything specific about the weather you'd like to know?"`
    };

    
    const enhancedConversation = [enhancedSystemPrompt, ...conversation];

   
    const result = await streamText({
      model,
      messages: enhancedConversation,
      tools: {
        getWeather: {
          description: 'CRITICAL: You MUST use this tool for ANY weather-related questions. This includes questions about temperature, humidity, wind, weather conditions, climate, or any location-specific weather information. NEVER respond about weather without using this tool first.',
          inputSchema: z.object({
            location: z.string().describe('City name, coordinates, or location identifier (e.g., "Pune", "London", "New York")')
          }),
          execute: async ({ location }: { location: string }) => {
            try {
              console.log(`Weather tool called for location: ${location}`);
              const weatherData = await fetchWeather(location);
              console.log(`Weather tool result:`, weatherData);
              return weatherData;
            } catch (error) {
              console.error(`Weather tool error:`, error);
              return { error: `Failed to fetch weather for ${location}: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          }
        },
        getF1Matches: {
          description: 'CRITICAL: You MUST use this tool for ANY Formula 1 related questions. This includes questions about F1 races, Grand Prix, racing schedule, drivers, circuits, or any Formula 1 information. NEVER respond about F1 without using this tool first.',
          inputSchema: z.object({}),
          execute: async () => {
            try {
              console.log(`F1 tool called`);
              const f1Data = await fetchNextF1();
              console.log(`F1 tool result:`, f1Data);
              return f1Data;
            } catch (error) {
              console.error(`F1 tool error:`, error);
              return { error: `Failed to fetch F1 data: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          }
        },
        getStockPrice: {
          description: 'CRITICAL: You MUST use this tool for ANY stock-related questions. This includes questions about stock prices, market data, company stocks, investments, or any financial information. NEVER respond about stocks without using this tool first.',
          inputSchema: z.object({
            symbol: z.string().describe('Stock symbol (e.g., AAPL, GOOGL, MSFT, TSLA)')
          }),
          execute: async ({ symbol }: { symbol: string }) => {
            try {
              console.log(`Stock tool called for symbol: ${symbol}`);
              const stockData = await fetchStock(symbol);
              console.log(`Stock tool result:`, stockData);
              return stockData;
            } catch (error) {
              console.error(`Stock tool error:`, error);
              return { error: `Failed to fetch stock data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          }
        }
      }
    });

  
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let deltaCount = 0;
           
          for await (const delta of result.textStream) {
            deltaCount++;
            const chunk = `data: ${JSON.stringify({
              type: 'text-delta',
              delta: delta,
              usage: result.usage,
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(chunk));
          }

       
          if (deltaCount === 0) {
            const fallbackChunk = `data: ${JSON.stringify({
              type: 'text-delta',
              delta: "I'm processing your request. Let me gather the information you need and I'll be back with a detailed response and some follow-up questions to help you further!",
              usage: result.usage,
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(fallbackChunk));
          }
 
          const finalChunk = `data: ${JSON.stringify({
            type: 'done',
            usage: result.usage,
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(finalChunk));
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
