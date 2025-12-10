import { GameLog } from '@/components/GameLog';
import { Separator } from '@/components/ui/separator';
import { useSocketEvents } from '@/hooks/useSocketEvents';
import AppContent from './components/AppContent';

export default function App() {
  useSocketEvents();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Multiplayer Number Guessing Game</h1>
          <p className="text-sm text-muted-foreground">
            Create a player, join a room and try to guess the number.
          </p>
        </header>

        <Separator />

        <section className="space-y-6">
          <AppContent />
          <GameLog />
        </section>
      </main>
    </div>
  );
}
