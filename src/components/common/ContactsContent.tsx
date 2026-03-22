import React from 'react';
import Image from 'next/image';
import { UserCircleIcon, MoreHorizontalIcon, SearchIcon, ChevronDownIcon, FriendsIcon, GroupsIcon, FriendRequestIcon, GroupRequestIcon } from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';

interface ContactsContentProps {
  category: string;
}

export function ContactsContent({ category }: ContactsContentProps) {
  const contacts = [
    { id: 201, name: 'Ái Vy', avatar: 'https://picsum.photos/id/10/40/40', initial: 'A' },
    { id: 202, name: 'Anh Đào', avatar: 'https://picsum.photos/id/11/40/40' },
    { id: 203, name: 'Anh Thành chủ tro', avatar: 'https://picsum.photos/id/12/40/40' },
    { id: 213, name: 'Anh Thư', avatar: 'https://picsum.photos/id/13/40/40' },
    { id: 214, name: 'Băng Chẳng Năng', avatar: 'https://picsum.photos/id/14/40/40', initial: 'B' },
    { id: 215, name: 'Bảo Duy', avatar: 'https://picsum.photos/id/15/40/40' },
    { id: 216, name: 'Bảo Ngọc', avatar: 'https://picsum.photos/id/16/40/40' },
    { id: 217, name: 'Bích Diễm', avatar: 'https://picsum.photos/id/17/40/40' },
    { id: 204, name: 'Bình Pờ', avatar: 'https://picsum.photos/id/1/40/40' },
    { id: 205, name: 'Bùi Ngọc Sang', avatar: 'https://picsum.photos/id/2/40/40' },
    { id: 206, name: 'Bùi Tuấn Anh', avatar: 'https://picsum.photos/id/3/40/40' },
    { id: 207, name: 'Cao Hoàng Minh Cơ', avatar: 'https://picsum.photos/id/4/40/40', initial: 'C' },
    { id: 208, name: 'Chí Thiện', avatar: 'https://picsum.photos/id/5/40/40' },
    { id: 209, name: 'Chí Trung', avatar: 'https://picsum.photos/id/6/40/40' },
    { id: 210, name: 'Chiên Kê', avatar: 'https://picsum.photos/id/7/40/40' },
  ];

  const groups = [
    { id: 301, name: 'TTDN_HK2_2025_2026_T.HUNG', members: '7 thành viên', avatar: 'https://picsum.photos/id/101/40/40' },
    { id: 302, name: 'SE_TTDN_HK2_2025_2026', members: '99 thành viên', avatar: 'https://picsum.photos/id/102/40/40' },
    { id: 303, name: 'FIT_SE_KTPM_Khóa 18', members: '349 thành viên', avatar: 'https://picsum.photos/id/103/40/40' },
    { id: 304, name: 'SHCN_DHKTPM18A', members: '75 thành viên', avatar: 'https://picsum.photos/id/104/40/40' },
    { id: 305, name: 'Gia đình là số 1', members: '11 thành viên', avatar: 'https://picsum.photos/id/105/40/40' },
    { id: 306, name: 'KTTKPM_DHKTPM18C_HK2_20252026', members: '69 thành viên', avatar: 'https://picsum.photos/id/106/40/40' },
    { id: 307, name: 'TÒA NHÀ GV02', members: '46 thành viên', avatar: 'https://picsum.photos/id/107/40/40' },
    { id: 308, name: 'TPP_TOEIC R&L: HỖ TRỢ HỌC VIÊN ĐẠT TARGET', members: '467 thành viên', avatar: 'https://picsum.photos/id/108/40/40' },
    { id: 309, name: 'Phòng trọ 3H', members: '3 thành viên', avatar: 'https://picsum.photos/id/109/40/40' },
    { id: 310, name: 'Dev KeToan', members: '6 thành viên', avatar: 'https://picsum.photos/id/110/40/40' },
    { id: 311, name: 'Nhóm Kiến Trúc Phần Mềm', members: '8 thành viên', avatar: 'https://picsum.photos/id/111/40/40' },
  ];

  const receivedInvites = [
    { 
      id: 1, 
      name: 'Nguyễn Xuân Nam', 
      date: '05/02', 
      source: 'Từ nhóm trò chuyện', 
      message: 'Xin chào, mình là Nguyễn Xuân Nam. Thấy bạn trong nhóm TTDN_HK2_2025_2026_T.HUNG nên mình muốn kết bạn!',
      avatar: 'https://picsum.photos/id/64/80/80'
    },
    { 
      id: 2, 
      name: 'Lê Anh Tuấn', 
      date: '30/12/23', 
      source: 'Từ nhóm trò chuyện', 
      message: 'Xin chào, mình là Lê Anh Tuấn. Mình biết bạn qua nhóm chung. Kết bạn với mình nhé!',
      avatar: 'https://picsum.photos/id/65/80/80'
    }
  ];

  const sentInvites = [
    { id: 11, name: 'Trương Hải', date: '7 ngày', avatar: 'https://picsum.photos/id/66/80/80' },
    { id: 12, name: 'Hùng Phạm', date: '05/02', avatar: 'https://picsum.photos/id/67/80/80' },
    { id: 13, name: 'Nguyễn Trọng Tiến', date: 'Bạn đã gửi lời mời', avatar: 'https://picsum.photos/id/68/80/80' },
  ];

  const isFriends = category === 'friends';
  const isInvites = category === 'invites';
  const isGroups = category === 'groups';

  const title = isFriends ? 'Danh sách bạn bè' : isGroups ? 'Danh sách nhóm và cộng đồng' : isInvites ? 'Lời mời kết bạn' : 'Lời mời vào nhóm và cộng đồng';
  const countLabel = isFriends ? `Bạn bè (${contacts.length})` : isGroups ? `Nhóm và cộng đồng (${groups.length})` : '';

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200 overflow-hidden">
      {/* HEADER */}
      <div className="h-[64px] bg-[var(--card-bg)] border-b border-[var(--border)] px-6 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            {category === 'friends' ? (
              <FriendsIcon size={22} />
            ) : category === 'groups' ? (
              <GroupsIcon size={22} />
            ) : category === 'invites' ? (
              <FriendRequestIcon size={22} />
            ) : (
              <GroupRequestIcon size={22} />
            )}
          </span>
          <span className="text-[17px] font-bold text-[var(--text)]">{title}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isInvites ? (
          <div className="p-4 space-y-6 w-full">
            {/* 1. Lời mời đã nhận */}
            <section>
              <h3 className="text-[14px] font-bold text-[var(--text)] mb-3 px-1 flex items-center gap-1.5 opacity-90">
                Lời mời đã nhận ({receivedInvites.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receivedInvites.map(req => (
                  <div key={req.id} className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-black/5">
                           <Image src={req.avatar} alt={req.name} width={48} height={48} className="object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-bold text-[var(--text)]">{req.name}</span>
                          <span className="text-[12px] text-[var(--sub-text)] mt-0.5">{req.date} - {req.source}</span>
                        </div>
                      </div>
                      <button className="text-[var(--sub-text)] hover:text-blue-500 p-1"><MoreHorizontalIcon size={18} /></button>
                    </div>
                    
                    <div className="bg-[var(--hover-bg)] p-3 rounded-lg text-[13.5px] text-[var(--text)] leading-relaxed">
                      {req.message}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button className="py-2 bg-[var(--hover-bg)] hover:opacity-80 text-[var(--text)] font-bold rounded-md transition-all text-[14px] cursor-pointer">
                        Từ chối
                      </button>
                      <button className="py-2 bg-[#0068FF] hover:bg-[#005AE0] text-white font-bold rounded-md transition-all text-[14px] cursor-pointer">
                        Đồng ý
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Lời mời đã gửi */}
            <section>
              <h3 className="text-[14px] font-bold text-[var(--text)] mb-3 px-1 flex items-center gap-1.5 opacity-90">
                Lời mời đã gửi (11)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sentInvites.map(req => (
                  <div key={req.id} className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] shadow-sm p-4 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-black/5">
                           <Image src={req.avatar} alt={req.name} width={48} height={48} className="object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-bold text-[var(--text)]">{req.name}</span>
                          <span className="text-[12px] text-[var(--sub-text)] mt-0.5">{req.date}</span>
                        </div>
                      </div>
                      <button className="text-[var(--sub-text)] hover:text-blue-500 p-1"><MoreHorizontalIcon size={18} /></button>
                    </div>

                    <button className="w-full py-2 bg-[var(--hover-bg)] hover:opacity-80 text-[var(--text)] font-bold rounded-md transition-all text-[14px] cursor-pointer">
                      Thu hồi lời mời
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-6">
                 <button className="px-6 py-1.5 bg-[var(--hover-bg)] hover:opacity-80 text-[var(--text)] font-bold rounded-md transition-all text-[13px] cursor-pointer">
                   Xem thêm
                 </button>
              </div>
            </section>

            {/* 3. Gợi ý kết bạn */}
            <section className="pt-4">
               <div className="flex items-center gap-2 px-1 cursor-pointer group">
                  <h3 className="text-[14px] font-bold text-[var(--text)] opacity-90">Gợi ý kết bạn (41)</h3>
                  <span className="text-[var(--sub-text)] group-hover:translate-x-1 transition-transform">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                  </span>
               </div>
            </section>
          </div>
        ) : (
          /* FRIENDS / GROUPS LIST */
          <div className="flex flex-col h-full">
            {/* SUB-HEADER (Count) */}
            <div className="bg-[var(--background)] py-4 px-6 flex-shrink-0 border-b border-black/5">
              <span className="text-[var(--text)] font-semibold text-[15.5px]">{countLabel}</span>
            </div>

            <div className="flex-1 flex flex-col bg-[var(--card-bg)] overflow-hidden mx-4 mb-4 rounded-xl border border-[var(--border)] shadow-sm">
              {/* FILTERS AREA */}
              <div className="px-6 py-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={isFriends ? "Tìm bạn" : "Tìm kiếm..."}
                    className="w-full bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] focus:bg-[var(--card-bg)] border border-[var(--border)] rounded-lg py-1.5 pl-9 pr-3 text-[14px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--search-placeholder)] focus:border-[#0068FF] shadow-sm"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sub-text)]"><SearchIcon size={16} /></div>
                </div>

                <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm min-w-[120px] focus:border-[#0068FF] outline-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" /></svg>
                  <span className="font-medium">{isFriends ? 'Tên (A-Z)' : 'Hoạt động (mới — cũ)'}</span>
                  <span className="text-[var(--sub-text)] ml-auto"><ChevronDownIcon size={14} /></span>
                </button>

                <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm min-w-[100px] focus:border-[#0068FF] outline-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  <span className="font-medium">Tất cả</span>
                  <span className="text-[var(--sub-text)] ml-auto"><ChevronDownIcon size={14} /></span>
                </button>
              </div>

              {/* CONTENT LIST */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {(isFriends ? contacts : groups).map((item: any) => {
                  return (
                    <React.Fragment key={item.id}>
                      {isFriends && item.initial && (
                        <div className="px-6 text-[var(--text)] font-bold text-[14px] mb-2 mt-4 uppercase tracking-wider opacity-80">
                          {item.initial}
                        </div>
                      )}

                      <div className={`mx-2 my-1 rounded-lg flex items-center group py-4 px-4 transition-all cursor-pointer hover:bg-[var(--active-bg)]`}>
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 mr-4 border border-black/5 shadow-sm">
                          <Image src={item.avatar} alt={item.name} width={48} height={48} className="object-cover" />
                        </div>

                        <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                          <span className={`text-[15.5px] truncate leading-snug text-[var(--text)] font-semibold`}>{item.name}</span>
                          {!isFriends && <span className="text-[12.5px] text-[var(--sub-text)] font-medium leading-snug">{item.members}</span>}
                        </div>

                        <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-black/5 rounded-full text-[var(--sub-text)] transition-all cursor-pointer">
                          <MoreHorizontalIcon size={20} />
                        </button>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
