import { ConversationListLegacy } from './ConversationListLegacy';
import type { ConversationListProps } from './ConversationListLegacy';

interface ConversationListViewProps {
  vm: ConversationListProps;
}

export function ConversationListView({ vm }: ConversationListViewProps) {
  return <ConversationListLegacy {...vm} />;
}
