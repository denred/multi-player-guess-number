import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/store/gameStore';
import { useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

export const GameLog = () => {
  const logs = useGameStore((state) => state.logs);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 border rounded">
          <Virtuoso
            ref={virtuosoRef}
            data={logs}
            followOutput="smooth"
            itemContent={(_index, entry) => (
              <div className="px-3 py-1 font-mono text-sm">{entry}</div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
