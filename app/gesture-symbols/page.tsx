import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Gesture symbols',
};

export default function GestureSymbolsPage() {
  redirect('/portrait/gesture-symbols');
}
