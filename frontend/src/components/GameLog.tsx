import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/store/gameStore';

export const GameLog = () => {
  const logs = useGameStore((state) => state.logs);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 overflow-y-auto space-y-1 font-mono text-sm">
          {logs.map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
