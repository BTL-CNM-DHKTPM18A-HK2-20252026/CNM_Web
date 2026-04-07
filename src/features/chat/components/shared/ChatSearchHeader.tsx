import { SearchIcon, AddUserIcon, CreateGroupIcon } from '@/components/ui/Icons';

interface ChatSearchHeaderProps {
  placeholder: string;
  value: string;
  isSearching: boolean;
  closeLabel: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onClose: () => void;
  onAddFriend?: () => void;
  onCreateGroup?: () => void;
}

export function ChatSearchHeader({
  placeholder,
  value,
  isSearching,
  closeLabel,
  onChange,
  onFocus,
  onClose,
  onAddFriend,
  onCreateGroup,
}: ChatSearchHeaderProps) {
  return (
    <div className="p-4 py-3 flex items-center gap-2">
      <div className="relative flex-1 flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className={`w-full ${isSearching ? 'bg-[var(--card-bg)] border-[#0068FF]' : 'bg-[var(--search-bg)] border-transparent'} rounded-lg py-1.5 pl-9 pr-8 text-[14px] text-[var(--text)] outline-none border transition-all placeholder:text-[var(--search-placeholder)]`}
        />
        <div className={`absolute left-3 ${isSearching ? 'text-[#0068FF]' : 'text-gray-400'}`}><SearchIcon size={16} /></div>
      </div>

      {isSearching ? (
        <button
          onClick={onClose}
          className="text-[15px] font-bold text-[var(--text)] px-1 cursor-pointer hover:opacity-80 active:scale-95"
        >
          {closeLabel}
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddFriend}
            className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"
          >
            <AddUserIcon size={20} />
          </button>
          <button
            onClick={onCreateGroup}
            className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"
          >
            <CreateGroupIcon size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
