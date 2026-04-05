import { ConversationListView } from './ConversationListView';
import type { ConversationListProps } from './ConversationListLegacy';
import { useConversationListViewModel } from './useConversationListViewModel';

export function ConversationList(props: ConversationListProps) {
  const vm = useConversationListViewModel(props);
  return <ConversationListView vm={vm} />;
}

export type { ConversationListProps } from './ConversationListLegacy';
export default ConversationList;
