import { 
  WeatherToolOutput, 
  F1MatchesToolOutput, 
  StockPriceToolOutput 
} from "@/lib/schemas";

 
export async function fetchOpenF1Data(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  try {
    const url = new URL(`https://api.openf1.org/v1/${endpoint}`);
    
     
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });


    const response = await fetch(url.toString(), { 
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`OpenF1 API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`OpenF1 API Error:`, {
      endpoint,
      params,
      error: error instanceof Error ? error.message : error
    });
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch OpenF1 data from ${endpoint}`);
  }
}

 
export async function fetchF1Drivers(params: {
  driver_number?: number;
  session_key?: string;
  meeting_key?: string;
  team_name?: string;
  country_code?: string;
} = {}): Promise<any> {
  return fetchOpenF1Data('drivers', params);
}

 
export async function fetchF1Sessions(params: {
  year?: number;
  meeting_key?: string;
  session_name?: string;
  session_type?: string;
  country_name?: string;
  country_code?: string;
  date_start?: string;
  date_end?: string;
} = {}): Promise<any> {
  return fetchOpenF1Data('sessions', params);
}

 
export async function fetchF1SessionResults(params: {
  session_key: string;
  position?: number;
  driver_number?: number;
  meeting_key?: string;
}): Promise<any> {
  return fetchOpenF1Data('session_result', params);
}
 
export async function fetchNextF1(): Promise<F1MatchesToolOutput> {
  try {
    const currentYear = new Date().getFullYear();
    const sessions = await fetchF1Sessions({ year: currentYear });
    
    if (!sessions || sessions.length === 0) {
      throw new Error("No F1 sessions found for current year");
    }

    const nextSession = sessions[0];
    
    return {
      season: currentYear.toString(),
      round: 1,
      raceName: nextSession.session_name || "Unknown Session",
      circuit: nextSession.circuit_short_name || "Unknown Circuit",
      country: nextSession.country_code || "Unknown Country",
      date: nextSession.date_start || "Unknown Date",
      time: nextSession.date_start || undefined,
      location: nextSession.location || "Unknown Location",
      driverStandings: null,
      constructorStandings: null,
      raceDetails: {
        session: nextSession
      }
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch F1 race data");
  }
}

// Alpha Vantage Stock API
export async function fetchStock(symbol: string): Promise<StockPriceToolOutput> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Alpha Vantage API key not configured");
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      throw new Error(`Stock API error: ${response.status}`);
    }

    const data = await response.json();
    const quote = data["Global Quote"];
    
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`Stock symbol "${symbol}" not found or no data available`);
    }

    const price = parseFloat(quote["05. price"]);
    const change = parseFloat(quote["09. change"]);
    const changePercent = parseFloat(quote["10. change percent"]?.replace("%", ""));

    if (isNaN(price)) {
      throw new Error("Invalid stock price data received");
    }

    return {
      symbol: quote["01. symbol"],
      price,
      change: isNaN(change) ? undefined : change,
      changePercent: isNaN(changePercent) ? undefined : changePercent
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch stock data");
  }
}

 
export async function fetchWeather(location: string): Promise<WeatherToolOutput> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenWeather API key not configured");
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Location "${location}" not found`);
      }
      if (response.status === 401) {
        throw new Error("Invalid OpenWeather API key");
      }
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      location: data.name,
      tempC: Math.round(data.main.temp),
      description: data.weather[0]?.description || "Unknown",
      icon: data.weather[0]?.icon || "unknown",
      humidity: data.main.humidity,
      windKph: Math.round((data.wind.speed * 3.6)) // Convert m/s to km/h
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch weather data");
  }
}
 
export function isValidWeatherResponse(data: unknown): data is WeatherToolOutput {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).location === "string" &&
    typeof (data as Record<string, unknown>).tempC === "number" &&
    typeof (data as Record<string, unknown>).description === "string" &&
    typeof (data as Record<string, unknown>).icon === "string" &&
    typeof (data as Record<string, unknown>).humidity === "number" &&
    typeof (data as Record<string, unknown>).windKph === "number"
  );
}

export function isValidF1Response(data: unknown): data is F1MatchesToolOutput {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).season === "string" &&
    typeof (data as Record<string, unknown>).round === "number" &&
    typeof (data as Record<string, unknown>).raceName === "string" &&
    typeof (data as Record<string, unknown>).circuit === "string" &&
    typeof (data as Record<string, unknown>).country === "string" &&
    typeof (data as Record<string, unknown>).date === "string" &&
    ((data as Record<string, unknown>).time === undefined || typeof (data as Record<string, unknown>).time === "string")
  );
}

export function isValidStockResponse(data: unknown): data is StockPriceToolOutput {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).symbol === "string" &&
    typeof (data as Record<string, unknown>).price === "number" &&
    ((data as Record<string, unknown>).change === undefined || typeof (data as Record<string, unknown>).change === "number") &&
    ((data as Record<string, unknown>).changePercent === undefined || typeof (data as Record<string, unknown>).changePercent === "number")
  );
}
