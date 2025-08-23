import { 
  WeatherToolOutput, 
  F1MatchesToolOutput, 
  StockPriceToolOutput 
} from "@/lib/schemas";

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

 
export async function fetchNextF1(): Promise<F1MatchesToolOutput> {
  try {
    const response = await fetch(
      "http://ergast.com/api/f1/current/next.json",
      { next: { revalidate: 300 } } //5 minutes 
    );

    if (!response.ok) {
      throw new Error(`F1 API error: ${response.status}`);
    }

    const data = await response.json();
    const race = data.MRData?.RaceTable?.Races?.[0];
    
    if (!race) {
      throw new Error("No upcoming F1 race found");
    }

    return {
      season: race.season,
      round: parseInt(race.round),
      raceName: race.raceName,
      circuit: race.Circuit?.circuitName || "Unknown Circuit",
      country: race.Circuit?.Location?.country || "Unknown Country",
      date: race.date,
      time: race.time
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
