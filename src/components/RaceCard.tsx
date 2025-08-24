import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Flag, MapPin, Calendar, Clock, Trophy, Users } from "lucide-react";

interface RaceCardProps {
  race: any;  
}

export default function RaceCard({ race }: RaceCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to extract array data from tool output
  const extractArrayData = (data: any): any[] => {
     if (Array.isArray(data)) {
      return data;
    }
    
     
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data).filter(key => !isNaN(Number(key)));
      if (keys.length > 0) {
        return keys.map(key => data[key]);
      }
    }
    
     
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    
     
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      const keys = Object.keys(data.data).filter(key => !isNaN(Number(key)));
      if (keys.length > 0) {
        return keys.map(key => data.data[key]);
      }
    }
    
    return [];
  };

   
  if (race?.error) {
    return <div className="text-red-600 p-4 bg-red-50 rounded-lg">
      {race.error}
    </div>;
  }

   
  const arrayData = extractArrayData(race);
 
  if (arrayData.length > 0 && arrayData[0]?.driver_number) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          F1 Drivers
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {arrayData.map((driver: any, index: number) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">#{driver.driver_number}</CardTitle>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: `#${driver.team_colour}` }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <div className="font-medium">{driver.full_name}</div>
                  <div className="text-xs">{driver.team_name}</div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Flag className="h-3 w-3 text-gray-500" />
                    <span>{driver.country_code}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {driver.broadcast_name}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
 
  if (arrayData.length > 0 && arrayData[0]?.session_name) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          F1 Sessions
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {arrayData.map((session: any, index: number) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{session.session_name}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded ${
                    session.session_type === 'Race' ? 'bg-red-100 text-red-800' :
                    session.session_type === 'Qualifying' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.session_type}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Flag className="h-3 w-3 text-gray-500" />
                    <span>{session.country_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-gray-500" />
                    <span>{session.circuit_short_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span>{formatDate(session.date_start)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {session.location}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
 
  if (arrayData.length > 0 && arrayData[0]?.position) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          F1 Session Results
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {arrayData.map((result: any, index: number) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">P{result.position}</CardTitle>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    #{result.driver_number}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span>{result.duration}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-gray-500" />
                    <span>{result.number_of_laps} laps</span>
                  </div>
                  {result.gap_to_leader > 0 && (
                    <div className="text-xs text-gray-500">
                      +{result.gap_to_leader}s to leader
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {result.dnf ? 'DNF' : result.dns ? 'DNS' : result.dsq ? 'DSQ' : 'Finished'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
 
  if (race?.raceName) {
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

  // Fallback for unknown data structures
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg">F1 Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(race, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
