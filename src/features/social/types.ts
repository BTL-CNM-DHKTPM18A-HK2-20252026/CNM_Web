export type PrivacyLevel = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

export interface SocialUser {
  id?: string;
  user_id?: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  avatarUrl?: string;
  phone_number?: string;
}

export interface PostMedia {
  mediaId: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  altText?: string;
  thumbnailUrl?: string;
}

export interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  siteName?: string;
}

export interface PostResponse {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  privacy: PrivacyLevel;
  location?: string;
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'LINK' | 'MIXED';
  mediaList: PostMedia[];
  linkMetadata?: LinkMetadata;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  currentUserReaction?: string;
  reactionCounts?: Record<string, number>;
  reactionNames?: Record<string, string[]>;
  hideLikes?: boolean;
  turnOffComments?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentResponse {
  commentId: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentCommentId?: string;
  replies?: CommentResponse[];
  createdAt: string;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface CreatePostRequest {
  content: string;
  privacy: PrivacyLevel;
  location?: string;
  linkUrl?: string;
  media?: Array<{
    url: string;
    altText?: string;
  }>;
  hideLikes?: boolean;
  turnOffComments?: boolean;
}

export interface StoryResponse {
  storyId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  mediaUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
  caption?: string;
  background?: string;
  viewCount: number;
  isViewedByMe: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface CreateStoryRequest {
  mediaUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
  caption?: string;
  background?: string;
}
