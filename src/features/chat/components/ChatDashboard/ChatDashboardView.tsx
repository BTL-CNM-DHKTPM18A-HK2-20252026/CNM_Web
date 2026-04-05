import type { ChatDashboardProps } from './ChatDashboardLegacy';
import { ChatDashboardLegacy } from './ChatDashboardLegacy';

interface ChatDashboardViewProps {
  vm: ChatDashboardProps;
}

export function ChatDashboardView({ vm }: ChatDashboardViewProps) {
  return <ChatDashboardLegacy {...vm} />;
}
