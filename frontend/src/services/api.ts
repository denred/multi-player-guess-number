import { API_BASE_URL } from '@/lib/config';

export const createPlayer = async (name: string) => {
  const response = await fetch(`${API_BASE_URL}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create player: ${response.status} ${errorText}`);
  }

  return response.json();
};
