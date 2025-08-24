import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { F1MatchesToolOutput } from "@/lib/schemas";
import { Flag, MapPin, Calendar, Clock } from "lucide-react";

interface RaceCardProps {
  race: F1MatchesToolOutput;
}

export default function RaceCard({ race }: RaceCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  if (race?.error) {
    return <div>
      {race?.error}
    </div>
  }
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{race.raceName}</CardTitle>
          <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
            Round {race.round}
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Flag className="h-4 w-4" />
          <span>{race.country}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{race.circuit}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{formatDate(race.date)}</span>
        </div>
        {race.time && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{race.time}</span>
          </div>
        )}
        <div className="pt-2 border-t">
          <span className="text-xs text-gray-500">Season {race.season}</span>
        </div>
      </CardContent>
    </Card>
  );
}
