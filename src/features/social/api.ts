import { apiClient } from '@/lib/http/apiClient';
import { PostResponse, CreatePostRequest, PostMedia, ReactionType, PrivacyLevel } from './types';

type RawPostResponse = Partial<PostResponse> & {
  authorAvatarUrl?: string;
  mediaUrls?: string[];
  isLikedByMe?: boolean;
  myReactionType?: string;
  reactionCounts?: Record<string, number>;
  reaction_counts?: Record<string, number>;
  reactionNames?: Record<string, string[]>;
  reaction_names?: Record<string, string[]>;
  sharedPost?: RawPostResponse;
  shareCount?: number;
};

const toIsoString = (value: unknown) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const normalizePost = (post: RawPostResponse): PostResponse => {
  const fallbackId = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Use 'media' array if available, fallback to mediaUrls
  let mediaList: PostMedia[] = [];
  if (Array.isArray((post as any).media)) {
    mediaList = (post as any).media.map((m: any) => ({
      mediaId: m.mediaId,
      url: m.url,
      type: m.type || 'IMAGE',
      altText: m.altText
    }));
  } else if (Array.isArray(post.mediaUrls)) {
    mediaList = post.mediaUrls.map((url, idx) => ({
      mediaId: `${post.postId || 'post'}-media-${idx}`,
      type: 'IMAGE' as const,
      url
    }));
  }

  return {
    postId: post.postId || fallbackId,
    authorId: post.authorId || '',
    authorName: post.authorName || '',
    authorAvatar: post.authorAvatar || post.authorAvatarUrl || '',
    content: post.content || '',
    privacy: post.privacy || 'PUBLIC',
    location: (post as any).location,
    type: (post as any).type || 'TEXT',
    mediaList,
    linkMetadata: (post as any).linkMetadata,
    likeCount: post.likeCount ?? 0,
    commentCount: post.commentCount ?? 0,
    isLiked: post.isLiked ?? post.isLikedByMe ?? false,
    currentUserReaction: post.currentUserReaction || post.myReactionType,
    reactionCounts: post.reactionCounts || (post as any).reaction_counts || {},
    reactionNames: post.reactionNames || (post as any).reaction_names || {},
    hideLikes: (post as any).hideLikes ?? false,
    turnOffComments: (post as any).turnOffComments ?? false,
    sharedPost: post.sharedPost ? normalizePost(post.sharedPost) : undefined,
    shareCount: post.shareCount ?? 0,
    createdAt: toIsoString(post.createdAt),
    updatedAt: toIsoString(post.updatedAt || post.createdAt),
  };
};

export const socialApi = {
  getFeed: async (page = 0, size = 20) => {
    const response = await apiClient.get<{ content: RawPostResponse[] }>(`/posts/feed?page=${page}&size=${size}`);
    return {
      ...response,
      content: Array.isArray(response?.content) ? response.content.map(normalizePost) : [],
    };
  },

  getUserPosts: async (userId: string, page = 0, size = 20) => {
    const response = await apiClient.get<{ content: RawPostResponse[] }>(`/posts/user/${userId}?page=${page}&size=${size}`);
    return {
      ...response,
      content: Array.isArray(response?.content) ? response.content.map(normalizePost) : [],
    };
  },

  uploadFiles: async (files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    try {
      const response = await apiClient.post<any[]>('/files/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.map(file => file.url || file.fileUrl);
    } catch (error) {
      console.error('Failed to upload files:', error);
      throw new Error('Could not upload media files');
    }
  },

  createPost: async (data: {
    content: string;
    privacy: PrivacyLevel;
    files?: File[];
    location?: string;
    altText?: string;
    hideLikes?: boolean;
    turnOffComments?: boolean;
    sharedPostId?: string;
  }, userId?: string) => {
    let mediaUrls: string[] = [];
    if (data.files && data.files.length > 0) {
      mediaUrls = await socialApi.uploadFiles(data.files);
    }

    const request: CreatePostRequest = {
      content: data.content,
      privacy: data.privacy,
      location: data.location,
      media: mediaUrls.map(url => ({
        url,
        altText: data.altText
      })),
      hideLikes: data.hideLikes,
      turnOffComments: data.turnOffComments,
      sharedPostId: data.sharedPostId
    };

    const response = await apiClient.post<RawPostResponse>('/posts', request, {
      headers: userId ? { 'X-User-Id': userId } : undefined,
    });
    return normalizePost(response);
  },

  reactToPost: async (postId: string, reaction: string): Promise<PostResponse> => {
    const response = await apiClient.post<RawPostResponse>(`/posts/${postId}/react/${reaction}`, {});
    return normalizePost(response);
  },

  likePost: async (postId: string) => {
    const response = await apiClient.post<RawPostResponse>(`/posts/${postId}/react/LIKE`, {});
    return normalizePost(response);
  },

  unlikePost: async (postId: string) => {
    const response = await apiClient.delete<RawPostResponse>(`/posts/${postId}/like`);
    return normalizePost(response);
  },
  
  getComments: (postId: string) => {
    return apiClient.get<CommentResponse[]>(`/posts/${postId}/comments`);
  },

  addComment: (postId: string, request: CreateCommentRequest) => {
    return apiClient.post<CommentResponse>(`/posts/${postId}/comments`, request);
  },

  reactToComment: (postId: string, commentId: string, type: string) => {
    return apiClient.post<CommentResponse>(`/posts/${postId}/comments/${commentId}/react/${type}`, {});
  },

  deletePost: (postId: string) => {
    return apiClient.delete(`/posts/${postId}`);
  },

  editPost: async (postId: string, data: { content: string; privacy: PrivacyLevel }) => {
    const response = await apiClient.put<RawPostResponse>(`/posts/${postId}`, data);
    return normalizePost(response);
  },

  // Story APIs
  createStory: async (data: {
    file?: File;
    mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
    caption?: string;
    background?: string;
  }, userId?: string) => {
    let mediaUrl = '';
    if (data.file) {
      const uploadedUrls = await socialApi.uploadFiles([data.file]);
      mediaUrl = uploadedUrls[0];
    }

    const request: any = {
      mediaUrl: mediaUrl || null,
      mediaType: data.mediaType,
      caption: data.caption || null,
      background: data.background || null
    };

    return apiClient.post<StoryResponse>('/stories', request, {
      headers: userId ? { 'X-User-Id': userId } : undefined,
    });
  },

  getActiveStories: async (userId: string, friendIds: string[]) => {
    const friendIdsStr = friendIds.join(',');
    return apiClient.get<StoryResponse[]>(`/stories/active?friendIds=${friendIdsStr}`, {
      headers: { 'X-User-Id': userId }
    });
  },

  viewStory: async (storyId: string, userId: string) => {
    return apiClient.post(`/stories/${storyId}/view`, {}, {
      headers: { 'X-User-Id': userId }
    });
  },

  getStoryFeed: async (userId: string, friendIds: string[] = []) => {
    const friendIdsStr = friendIds.length > 0 ? `?friendIds=${friendIds.join(',')}` : '';
    return apiClient.get<StoryResponse[]>(`/stories/feed${friendIdsStr}`, {
      headers: { 'X-User-Id': userId }
    });
  },

  reactToStory: async (storyId: string, reaction: string, userId: string) => {
    return apiClient.post(`/stories/${storyId}/react`, { reaction }, {
      headers: { 'X-User-Id': userId }
    });
  },

  replyToStory: async (storyId: string, content: string, userId: string) => {
    return apiClient.post(`/stories/${storyId}/reply`, { content }, {
      headers: { 'X-User-Id': userId }
    });
  },

  getStoryViewers: async (storyId: string, userId: string) => {
    return apiClient.get<StoryViewerResponse[]>(`/stories/${storyId}/viewers`, {
      headers: { 'X-User-Id': userId }
    });
  },

  deleteStory: async (storyId: string, userId: string) => {
    return apiClient.delete(`/stories/${storyId}`, {
      headers: { 'X-User-Id': userId }
    });
  },

  getExplorePosts: async (page = 0, size = 20) => {
    // Fetch a variety of posts for the explore page
    const response = await apiClient.get<{ content: RawPostResponse[] }>(`/posts/explore?page=${page}&size=${size}`);
    return {
      ...response,
      content: Array.isArray(response?.content) ? response.content.map(normalizePost) : [],
    };
  },

  toggleBookmark: async (postId: string) => {
    return apiClient.post(`/posts/${postId}/bookmark`, {});
  },

  // ── Recommendation APIs ──────────────────────────────────────────────────

  /**
   * Ranked feed — applies affinity × engagement × time_decay scoring.
   * Falls back to regular feed if backend doesn't support it yet.
   */
  getRankedFeed: async (page = 0, size = 20) => {
    try {
      const response = await apiClient.get<{ content: RawPostResponse[] }>(`/posts/feed/ranked?page=${page}&size=${size}`);
      return {
        ...response,
        content: Array.isArray(response?.content) ? response.content.map(normalizePost) : [],
      };
    } catch {
      // Fallback to normal feed
      return socialApi.getFeed(page, size);
    }
  },

  /**
   * Track that a user viewed a post (used for affinity scoring).
   */
  trackPostView: async (postId: string) => {
    try {
      await apiClient.post('/interactions/post-view', { postId });
    } catch {
      // Non-critical — fire and forget
    }
  },

  /**
   * Track reel watch progress (used for watch-completion scoring).
   */
  trackReelWatch: async (data: {
    reelId: string;
    watchedDuration: number;
    totalDuration: number;
    isCompleted: boolean;
    rewatchCount?: number;
    source?: 'feed' | 'explore' | 'search';
  }) => {
    try {
      await apiClient.post('/interactions/reel-watch', data);
    } catch {
      // Non-critical — fire and forget
    }
  },

  /**
   * Get suggested posts for Discovery/Explore section.
   */
  getSuggestedPosts: async (page = 0, size = 10) => {
    try {
      const response = await apiClient.get<{ content: RawPostResponse[] }>(`/posts/suggested?page=${page}&size=${size}`);
      return {
        ...response,
        content: Array.isArray(response?.content) ? response.content.map(normalizePost) : [],
      };
    } catch {
      return { content: [] };
    }
  },
};
