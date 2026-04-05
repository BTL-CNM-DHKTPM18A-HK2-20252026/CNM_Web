import { ChatDashboardView } from './ChatDashboardView';
import type { ChatDashboardProps } from './ChatDashboardLegacy';
import { useChatDashboardViewModel } from './useChatDashboardViewModel';

export function ChatDashboard(props: ChatDashboardProps) {
  const vm = useChatDashboardViewModel(props);
  return <ChatDashboardView vm={vm} />;
}

export type { ChatDashboardProps } from './ChatDashboardLegacy';
export default ChatDashboard;
