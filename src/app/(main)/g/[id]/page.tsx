import GroupJoinClient from './GroupJoinClient';

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function GroupJoinPage() {
  return <GroupJoinClient />;
}
