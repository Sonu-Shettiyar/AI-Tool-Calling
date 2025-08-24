import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  fetchWeather, 
  fetchNextF1, 
  fetchStock, 
  fetchF1Drivers,
  fetchF1Sessions,
  fetchF1SessionResults
} from '@/lib/tools';
import { defaultRateLimiter } from '@/lib/rateLimit';

const chatInputSchema = z.object({
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.union([z.string(), z.record(z.string(), z.unknown())]),
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

    const conversation = messages.map(msg => {
       
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      
      if (msg.role === 'tool') {
        return {
          role: 'assistant' as const,
          content,
        };
      }
      if (msg.role === 'user') {
        return {
          role: 'user' as const,
          content,
        };
      }
      if (msg.role === 'assistant') {
        return {
          role: 'assistant' as const,
          content,
        };
      }
      if (msg.role === 'system') {
        return {
          role: 'system' as const,
          content,
        };
      }
       
      return {
        role: 'user' as const,
        content,
      };
    }) as any;

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
- getF1Matches: For general Formula 1 information and upcoming races
- getF1Drivers: For F1 driver information (driver number, team, country, etc.)
- getF1Sessions: For F1 session information (practice, qualifying, race sessions)
- getF1SessionResults: For F1 session results and race positions
- getStockPrice: For current stock prices and market data

**Core F1 Tools:**
- getF1Drivers: Get driver information by driver number, session key, team, or country
- getF1Sessions: Get session information by year, country, session type, or date range
- getF1SessionResults: Get race/qualifying results by session key, position, or driver number

**Tool Chaining Examples:**
- To get driver info and then their results: Use getF1Drivers first, then getF1SessionResults with the session_key
- To get session info and then results: Use getF1Sessions first, then getF1SessionResults with the session_key
- To get results and then driver details: Use getF1SessionResults first, then getF1Drivers with the driver_number

Example: If someone asks "What happened during the sprint race in China?", you should:
1. Use getF1Sessions to find the China sprint session
2. Use getF1SessionResults with the session_key to get the race results
3. Provide a comprehensive answer about the race

For F1 questions:
- Use getF1Drivers for driver-specific queries
- Use getF1Sessions for session and calendar queries
- Use getF1SessionResults for race results and positions
- Chain tools together when you need multiple pieces of information
- Always provide engaging responses with the data and ask follow-up questions

The OpenF1 API provides real-time and historical F1 data! You can chain these tools together to get comprehensive information about any aspect of Formula 1 racing.`
    } as any;

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
          description: 'CRITICAL: You MUST use this tool for ANY general Formula 1 related questions. This includes questions about F1 races, Grand Prix, racing schedule, or any Formula 1 information. NEVER respond about F1 without using this tool first. This tool provides basic F1 data including upcoming races and current season information.',
          inputSchema: z.object({
            type: z.enum(['races', 'season', 'all']).optional().describe('Type of F1 data to fetch. Defaults to "all" for comprehensive information.')
          }),
          execute: async ({ type = 'all' }: { type?: 'races' | 'season' | 'all' }) => {
            try {
              console.log(`F1 tool called for type: ${type}`);
              const f1Data = await fetchNextF1();
              console.log(`F1 tool result:`, f1Data);
              return f1Data;
            } catch (error) {
              console.error(`F1 tool error:`, error);
              return { error: `Failed to fetch F1 data: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          }
        },
        getF1Drivers: {
          description: 'Use this tool to fetch F1 driver information including driver number, team, country, and personal details. Perfect for getting information about specific drivers or all drivers in a session.',
          inputSchema: z.object({
            driver_number: z.number().optional().describe('Driver number (e.g., 44 for Hamilton, 1 for Verstappen)'),
            session_key: z.string().optional().describe('Session key to get drivers for a specific session'),
            meeting_key: z.string().optional().describe('Meeting key to get drivers for a specific race weekend'),
            team_name: z.string().optional().describe('Team name to filter drivers (e.g., "Red Bull Racing", "Mercedes")'),
            country_code: z.string().optional().describe('Country code to filter drivers (e.g., "GBR", "NED")')
          }),
          execute: async (params: any) => {
            try {
              console.log(`F1 Drivers tool called with params:`, params);
              const driversData = await fetchF1Drivers(params);
              console.log(`F1 Drivers tool result:`, driversData);
              return { type: 'drivers', data: driversData, params };
            } catch (error) {
              console.error(`F1 Drivers tool error:`, error);
              return { error: `Failed to fetch F1 drivers: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          }
        },
        getF1Sessions: {
          description: 'Use this tool to fetch F1 session information including practice, qualifying, and race sessions. Great for getting race schedules, session details, and calendar information.',
          inputSchema: z.object({
            year: z.number().optional().describe('Year to filter sessions (e.g., 2025, 2024, 2023)'),
            meeting_key: z.string().optional().describe('Meeting key to filter sessions for a specific race weekend'),
            session_name: z.string().optional().describe('Session name (e.g., "Practice 1", "Qualifying", "Race", "Sprint")'),
            session_type: z.string().optional().describe('Session type (e.g., "Practice", "Qualifying", "Race")'),
            country_name: z.string().optional().describe('Country name to filter sessions (e.g., "Belgium", "China", "Australia")'),
            country_code: z.string().optional().describe('Country code to filter sessions (e.g., "BEL", "CHN", "AUS")'),
            date_start: z.string().optional().describe('Start date for time range filtering (YYYY-MM-DD)'),
            date_end: z.string().optional().describe('End date for time range filtering (YYYY-MM-DD)')
          }),
          execute: async (params: any) => {
            try {
              console.log(`F1 Sessions tool called with params:`, params);
              const sessionData = await fetchF1Sessions(params);
              console.log(`F1 Sessions tool result:`, sessionData);
              return { type: 'sessions', data: sessionData, params };
            } catch (error) {
              console.error(`F1 Sessions tool error:`, error);
              return { error: `Failed to fetch F1 sessions: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          }
        },
        getF1SessionResults: {
          description: 'Use this tool to fetch F1 session results including race positions, lap times, and driver performance. Perfect for getting race results, qualifying results, or any session outcome.',
          inputSchema: z.object({
            session_key: z.string().describe('Session key (required) - get this from getF1Sessions tool first'),
            position: z.number().optional().describe('Filter by specific position (e.g., 1 for winner, top 3 for podium)'),
            driver_number: z.number().optional().describe('Driver number to filter results for a specific driver'),
            meeting_key: z.string().optional().describe('Meeting key to filter results for a specific race weekend')
          }),
          execute: async (params: any) => {
            try {
              console.log(`F1 Session Results tool called with params:`, params);
              const resultsData = await fetchF1SessionResults(params);
              console.log(`F1 Session Results tool result:`, resultsData);
              return { type: 'session_results', data: resultsData, params };
            } catch (error) {
              console.error(`F1 Session Results tool error:`, error);
              return { error: `Failed to fetch F1 session results: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
           
          const toolResults: Array<{
            type: 'weather' | 'f1' | 'stock';
            data: any;
          }> = [];

          // Process the AI response
          for await (const delta of result.fullStream) {
            if (delta.type === 'text-delta') {
               
              console.log(delta,'delta at line:156')
              const chunk = `data: ${JSON.stringify({
                type: 'text-delta',
                delta: delta.text,
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(chunk));
            } else if (delta.type === 'tool-call') {
              console.log('Tool call detected:', delta.toolName);
              // Tool call is happening, we'll get the result in tool-result
            } else if (delta.type === 'tool-result') {
              console.log('Tool result received:', delta.toolName, delta);
              
              // Store tool results to send later
              let toolType: 'weather' | 'f1' | 'stock';
              if (delta.toolName === 'getWeather') {
                toolType = 'weather';
              } else if (delta.toolName === 'getF1Matches' || delta.toolName === 'getF1Drivers' || 
                         delta.toolName === 'getF1Sessions' || delta.toolName === 'getF1SessionResults') {
                toolType = 'f1';
              } else if (delta.toolName === 'getStockPrice') {
                toolType = 'stock';
              } else {
                continue; // Skip unknown tools
              }

              toolResults.push({
                type: toolType,
                data: delta.output
              });

              // Send tool result immediately
              const toolChunk = `data: ${JSON.stringify({
                type: 'tool-result',
                toolType,
                data: delta.output
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(toolChunk));
            }
          }

          // Send final chunk
          const finalChunk = `data: ${JSON.stringify({
            type: 'done',
            toolResults
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(finalChunk));
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorChunk = `data: ${JSON.stringify({
            type: 'error',
            error: 'Something went wrong processing your request'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorChunk));
          controller.close();
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