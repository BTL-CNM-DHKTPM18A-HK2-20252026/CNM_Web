import React, { useState } from 'react';
import { 
  Archive as ArchiveIcon, 
  Search, 
  Filter, 
  Folder, 
  FileText, 
  Code, 
  MoreVertical,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Image as ImageIcon,
  Film,
  Heart,
  File as FileIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { socialApi } from '../api';
import { SocialUser } from '../types';
import { toast } from 'sonner';

interface ArchiveItem {
  id: string;
  title: string;
  description: string;
  type: 'posts' | 'stories' | 'files' | 'favorites';
  tags: string[];
  archivedAt: string;
  isPrivate: boolean;
  icon: 'post' | 'story' | 'file' | 'favorite';
  color: string;
}

const DUMMY_FILES: ArchiveItem[] = [
  {
    id: 'f-1',
    title: 'Hợp đồng dự án Fruvia',
    description: 'File PDF chi tiết hợp đồng và điều khoản sử dụng.',
    type: 'files',
    tags: ['Tài liệu', 'My Documents', 'PDF'],
    archivedAt: '18 thg 4, 2024',
    isPrivate: true,
    icon: 'file',
    color: 'bg-emerald-500/10 text-emerald-500',
  }
];

export const SocialArchive: React.FC<{ user: SocialUser | null, onBack?: () => void }> = ({ user, onBack }) => {
  const { t, i18n } = useTranslation();
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'stories' | 'files' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const userId = user.id || user.user_id;
        if (!userId) return;

        // Fetch Posts
        const postsResponse = await socialApi.getUserPosts(userId);
        const mappedPosts: ArchiveItem[] = (postsResponse.content || []).map(post => ({
          id: post.postId,
          title: post.content ? (post.content.substring(0, 30) + (post.content.length > 30 ? '...' : '')) : t('social.archive.post_untitled'),
          description: post.content || t('social.archive.post_no_content'),
          type: 'posts',
          tags: [t('social.archive.posts'), post.privacy, post.type],
          archivedAt: new Date(post.createdAt).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US'),
          isPrivate: post.privacy !== 'PUBLIC',
          icon: 'post',
          color: 'bg-blue-500/10 text-[#0095F6]',
        }));

        // Fetch Stories (filtering for current user)
        const storiesResponse = await socialApi.getStoryFeed(userId);
        const mappedStories: ArchiveItem[] = (storiesResponse || [])
          .filter(s => s.authorId === userId)
          .map(story => ({
            id: story.storyId,
            title: story.caption || t('social.archive.my_moment'),
            description: story.caption || t('social.archive.story_shared'),
            type: 'stories',
            tags: [t('social.archive.stories'), story.mediaType],
            archivedAt: new Date(story.createdAt).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US'),
            isPrivate: false,
            icon: 'story',
            color: 'bg-orange-500/10 text-orange-500',
          }));

        // Combine with dummy files and favorites for now
        setItems([...mappedPosts, ...mappedStories, ...DUMMY_FILES]);
      } catch (error) {
        console.error('Failed to fetch archive data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, t, i18n.language]);

  const handleRestore = (id: string, title: string) => {
    // Logic to restore
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success(t('social.archive.restore_success', 'Đã khôi phục "{{title}}"', { title }));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success(t('social.archive.delete_success', 'Đã xóa khỏi lưu trữ'));
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    
    const newItem: ArchiveItem = {
      id: `coll-${Date.now()}`,
      title: newCollectionName,
      description: t('social.archive.empty_collection', 'Bộ sưu tập mới được tạo'),
      type: 'favorites',
      tags: [t('social.archive.collection')],
      archivedAt: new Date().toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US'),
      isPrivate: true,
      icon: 'favorite',
      color: 'bg-purple-500/10 text-purple-500',
    };
    
    setItems([newItem, ...items]);
    setNewCollectionName('');
    setShowCreateModal(false);
    toast.success(t('social.archive.create_success', 'Đã tạo bộ sưu tập mới'));
  };


  const counts = {
    all: items.length,
    posts: items.filter(i => i.type === 'posts').length,
    stories: items.filter(i => i.type === 'stories').length,
    files: items.filter(i => i.type === 'files').length,
    favorites: items.filter(i => i.type === 'favorites').length,
  };

  const renderIcon = (iconType: string, colorClass: string) => {
    switch (iconType) {
      case 'post':
        return <ImageIcon size={24} className="text-current" />;
      case 'story':
        return <Film size={24} className="text-current" />;
      case 'file':
        return <FileIcon size={24} className="text-current" />;
      case 'favorite':
        return <Heart size={24} className="text-current" />;
      default:
        return <FileText size={24} className="text-current" />;
    }
  };

  const filteredArchives = items.filter(item => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredArchives.length / itemsPerPage);
  const paginatedItems = filteredArchives.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to top of list
    const listElement = document.getElementById('archive-list');
    if (listElement) listElement.scrollIntoView({ behavior: 'smooth' });
  };


  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-100 animate-in fade-in duration-500 overflow-hidden">
      {/* Header section */}
      <div className="flex flex-col gap-6 p-8 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">

            <ArchiveIcon size={28} className="text-gray-900 dark:text-white mt-1" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('social.archive.title')}</h1>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">{t('social.archive.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#0095F6] hover:bg-[#1877F2] text-white px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <Plus size={18} />
              {t('social.archive.create_new')}
            </button>
            <div className="relative">
              <button className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-[#1A1A1A] hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors relative cursor-pointer">
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1A1A1A]"></span>
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-500 overflow-hidden border border-gray-200 dark:border-zinc-800 cursor-pointer">
              {user?.avatar || user?.avatar_url ? (
                <img 
                  src={user.avatar || user.avatar_url} 
                  alt={user.full_name || user.displayName || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-tr from-orange-500 to-amber-400">
                  {(user?.full_name || user?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-6 border-b border-gray-200 dark:border-zinc-800">
            <button 
              onClick={() => setActiveTab('all')}
              className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'all' ? 'text-[#0095F6]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              {t('social.archive.all')} <span className="ml-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1A1A1A] text-[12px] text-gray-600 dark:text-gray-300">{counts.all}</span>
              {activeTab === 'all' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0095F6]" />}
            </button>
            <button 
              onClick={() => setActiveTab('posts')}
              className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'posts' ? 'text-[#0095F6]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              {t('social.archive.posts')} <span className="ml-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1A1A1A] text-[12px] text-gray-600 dark:text-gray-300">{counts.posts}</span>
              {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0095F6]" />}
            </button>
            <button 
              onClick={() => setActiveTab('stories')}
              className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'stories' ? 'text-[#0095F6]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              {t('social.archive.stories')} <span className="ml-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1A1A1A] text-[12px] text-gray-600 dark:text-gray-300">{counts.stories}</span>
              {activeTab === 'stories' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0095F6]" />}
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'files' ? 'text-[#0095F6]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              {t('social.archive.files')} <span className="ml-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1A1A1A] text-[12px] text-gray-600 dark:text-gray-300">{counts.files}</span>
              {activeTab === 'files' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0095F6]" />}
            </button>
            <button 
              onClick={() => setActiveTab('favorites')}
              className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'favorites' ? 'text-[#0095F6]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              {t('social.archive.favorites')} <span className="ml-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1A1A1A] text-[12px] text-gray-600 dark:text-gray-300">{counts.favorites}</span>
              {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0095F6]" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('social.archive.search_placeholder')} 
                className="w-[280px] bg-gray-100 dark:bg-[#1A1A1A] border border-transparent focus:border-gray-300 dark:focus:border-zinc-700 rounded-lg pl-10 pr-12 py-2.5 text-[14px] text-gray-900 dark:text-white outline-none transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-800 rounded text-[10px] text-gray-500 dark:text-gray-400 font-sans border border-gray-300 dark:border-zinc-700">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-800 rounded text-[10px] text-gray-500 dark:text-gray-400 font-sans border border-gray-300 dark:border-zinc-700">K</kbd>
              </div>
            </div>
            <button className="flex items-center gap-2 bg-gray-100 dark:bg-[#1A1A1A] hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-[14px] font-medium transition-colors cursor-pointer">
              <Filter size={16} />
              {t('social.archive.filter')}
              <ChevronDown size={14} className="ml-1 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#0095F6] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">{t('social.archive.loading')}</p>
          </div>
        ) : filteredArchives.length > 0 ? (
          <div id="archive-list" className="flex flex-col gap-3">
            {paginatedItems.map((item) => {
              return (
                <div key={item.id} className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] border border-gray-200 dark:border-zinc-800/50 hover:border-gray-300 dark:hover:border-zinc-700 transition-all cursor-pointer">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                      {renderIcon(item.icon, item.color)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.title}</h4>
                        {item.isPrivate && <Lock size={12} className="text-gray-400 dark:text-gray-500" />}
                      </div>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-2">{item.description}</p>
                      <div className="flex items-center gap-2">
                        {item.tags.map((tag, index) => {
                          return (
                            <span key={index} className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              index === 0 ? 'text-[#0095F6]' : 
                              tag.includes('React') || tag.includes('Next') || tag.includes('Python') ? 'text-emerald-500' : 'text-purple-500'
                            }`}>
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-[13px] text-gray-400 dark:text-gray-500 hidden sm:block">{t('social.archive.archived_on', { date: item.archivedAt })}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRestore(item.id, item.title); }}
                      className="px-4 py-1.5 bg-white dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 text-[13px] font-medium rounded-lg transition-colors border border-gray-200 dark:border-zinc-800 cursor-pointer"
                    >
                      {t('social.archive.restore')}
                    </button>
                    <div className="relative group/more">
                      <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] rounded-lg transition-colors cursor-pointer">
                        <MoreVertical size={18} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl hidden group-hover/more:block z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          className="w-full text-left px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          {t('social.archive.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-zinc-800 border-dashed">
            <ArchiveIcon size={48} className="text-gray-300 dark:text-zinc-700 mb-4" />
            <p className="text-gray-500 dark:text-zinc-500 text-[15px]">{t('social.archive.empty')}</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-[#1A1A1A] text-gray-400 dark:text-gray-500 disabled:opacity-50 hover:text-gray-600 dark:hover:text-gray-300 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-zinc-800 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <button 
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-all ${
                  currentPage === i + 1 
                  ? 'bg-[#0095F6] text-white' 
                  : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] cursor-pointer'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button 
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-[#1A1A1A] text-gray-400 dark:text-gray-500 disabled:opacity-50 hover:text-gray-600 dark:hover:text-gray-200 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-zinc-800 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('social.archive.create_title', 'Tạo bộ sưu tập mới')}</h3>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">{t('social.archive.create_desc', 'Sắp xếp các bài viết và tệp tin của bạn vào một thư mục riêng.')}</p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-400">{t('social.archive.name', 'Tên bộ sưu tập')}</label>
                  <input 
                    type="text" 
                    autoFocus
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder={t('social.archive.name_placeholder', 'VD: Dự án mùa hè, Ảnh kỷ niệm...')}
                    className="w-full bg-gray-100 dark:bg-[#121212] border border-transparent focus:border-[#0095F6] rounded-xl px-4 py-3 text-[15px] outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 bg-gray-50 dark:bg-[#222] border-t border-gray-200 dark:border-zinc-800">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-[14px] text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
              >
                {t('social.archive.cancel', 'Hủy')}
              </button>
              <button 
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="flex-1 py-2.5 rounded-xl font-bold text-[14px] bg-[#0095F6] text-white hover:bg-[#1877F2] disabled:opacity-50 transition-colors"
              >
                {t('social.archive.create', 'Tạo mới')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
