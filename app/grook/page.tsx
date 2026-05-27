import type { Metadata } from 'next';
import Chat from './Chat';

export const metadata: Metadata = {
  title: 'grook · peek.gift',
  description: 'Chat with Peek to build a gift page.',
};

export default function GrookPage() {
  return <Chat />;
}
