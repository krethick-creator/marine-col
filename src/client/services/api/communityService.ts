import { cacheData, getCachedData } from '../offline/cacheService';
import { useAppStore } from '../../store';
import type { CommunityPost, PostType } from '../../types';

export interface FetchPostsParams {
  category?: string;
  sort?: 'latest' | 'oldest' | 'popular';
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreatePostPayload {
  postType: PostType;
  title: string;
  content: string;
  locationName?: string;
  lat?: number;
  lon?: number;
  userName?: string;
  userRole?: string;
}

export async function fetchCommunityPosts(params: FetchPostsParams = {}): Promise<{ ok: boolean; data?: CommunityPost[]; total?: number; error?: string; isCached?: boolean }> {
  const offlineMode = useAppStore.getState().offlineMode;
  const userLoc = useAppStore.getState().user.location;
  const lat = userLoc?.lat || 13.0827;
  const lon = userLoc?.lon || 80.2707;

  if (offlineMode || !navigator.onLine) {
    const cached = await getCachedData('community_posts', lat, lon);
    if (cached) {
      return {
        ok: true,
        data: cached.data.map((p: any) => ({ ...p, isCached: true, fetchedAt: cached.fetchedAt })),
        total: cached.data.length,
        isCached: true,
      };
    }
    return { ok: false, error: 'Offline: No cached community posts available.' };
  }

  try {
    const q = new URLSearchParams();
    if (params.category && params.category !== 'ALL') q.append('type', params.category);
    if (params.sort) q.append('sort', params.sort);
    if (params.location) q.append('location', params.location);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', String(params.page));
    if (params.limit) q.append('limit', String(params.limit));

    const { useAuthStore } = await import('../../store/authStore');
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/community?${q.toString()}`, {
      headers,
      credentials: 'include',
    });
    const json = await res.json();

    if (json.ok && Array.isArray(json.data)) {
      const locationName = useAppStore.getState().user.locationName || '';
      await cacheData('community_posts', lat, lon, locationName, json.data);
      return { ok: true, data: json.data, total: json.total };
    }
    return { ok: false, error: json.error || 'Failed to fetch community posts' };
  } catch (error: any) {
    console.error('Error fetching community posts:', error);
    const cached = await getCachedData('community_posts', lat, lon);
    if (cached) {
      return {
        ok: true,
        data: cached.data.map((p: any) => ({ ...p, isCached: true, fetchedAt: cached.fetchedAt })),
        total: cached.data.length,
        isCached: true,
      };
    }
    return { ok: false, error: error.message || 'Failed to fetch community posts' };
  }
}

export async function createCommunityPost(payload: CreatePostPayload): Promise<{ ok: boolean; data?: CommunityPost; error?: string }> {
  try {
    const { useAuthStore } = await import('../../store/authStore');
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/community', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.ok) {
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json.error || 'Failed to create post' };
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { ok: false, error: error.message || 'Network error while creating post' };
  }
}

export async function reactToPost(postId: string, type: 'like' | 'helpful' | 'verify'): Promise<{ ok: boolean; data?: CommunityPost; error?: string }> {
  try {
    const { useAuthStore } = await import('../../store/authStore');
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/community/${postId}/react`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ type }),
    });
    const json = await res.json();
    if (json.ok) {
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json.error || 'Failed to react to post' };
  } catch (error: any) {
    console.error('Error reacting to post:', error);
    return { ok: false, error: error.message || 'Failed to send reaction' };
  }
}
