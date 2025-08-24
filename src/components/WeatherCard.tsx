import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { WeatherToolOutput } from "@/lib/schemas";
import { Cloud, Droplets, Wind } from "lucide-react";

interface WeatherCardProps {
  weather: WeatherToolOutput;
}

export default function WeatherCard({ weather, ...props }: WeatherCardProps) {

  if (weather?.error) {
    return <div>
      {weather?.error}
    </div>
  }
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{weather.location}</CardTitle>
        <div className="flex items-center justify-center space-x-2">
          <Cloud className="h-8 w-8 text-blue-500" />
          <span className="text-2xl font-bold">{weather.tempC}°C</span>
        </div>
        <p className="text-sm text-gray-600 capitalize">{weather.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Droplets className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-600">Humidity</span>
          </div>
          <span className="text-sm font-medium">{weather.humidity}%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wind className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Wind</span>
          </div>
          <span className="text-sm font-medium">{weather.windKph} km/h</span>
        </div>
      </CardContent>
    </Card>
  );
}
