const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function apiUrlFor(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export type ApiListing = {
  id: string;
  name: string;
  category: string;
  area: string;
  description: string;
  hours: string;
  phone: string;
  rating: string;
  price: string;
  hasImage: boolean;
  imageUrl: string | null;
  hasLogo: boolean;
  logoUrl: string | null;
  hasMenu: boolean;
  menuUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  tag: string | null;
  avgRating: number | null;
  ratingCount: number;
  latitude: number | null;
  longitude: number | null;
};

// A place's photo can be an uploaded file OR a pasted URL. The URL wins
// when both are set. Returns null if there's no image at all.
export function resolveImageSrc(item: { hasImage: boolean; imageUrl: string | null }, blobUrl: string): string | null {
  if (item.imageUrl) return item.imageUrl;
  if (item.hasImage) return blobUrl;
  return null;
}

export function imageUrlFor(listingId: string): string {
  return apiUrlFor(`/api/listings/${listingId}/image`);
}

export function logoUrlFor(listingId: string): string {
  return apiUrlFor(`/api/listings/${listingId}/logo`);
}

export function menuUrlFor(listingId: string): string {
  return apiUrlFor(`/api/listings/${listingId}/menu`);
}

// Real coordinates (when set) give a precise map pin link; otherwise falls
// back to a text search by name + area/location. Uses the "search" endpoint
// (just drops a pin) instead of "dir" (routing), since routing without a
// known origin made Google Maps guess a starting point and produce wrong
// directions - the app has no way to know the user's real live location.
export function directionsUrlFor(item: { latitude: number | null; longitude: number | null; name: string; area?: string; location?: string }): string {
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  // No exact coordinates set in admin yet - fall back to a text destination.
  const query = `${item.name}, ${item.area ?? item.location ?? ''}, Tyre Lebanon`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function fetchListings(): Promise<ApiListing[]> {
  return fetch(apiUrlFor('/api/listings')).then((res) => handle(res));
}

// ---------- User auth ----------
const TOKEN_KEY = 'wtgs-auth-token';
const USER_KEY = 'wtgs-auth-user';

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  address: string;
  dateOfBirth: string;
  sourCardCode: string;
};

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): CurrentUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

function setSession(token: string, user: CurrentUser) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type RegisterInput = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  address: string;
  dateOfBirth: string;
  password: string;
};

// Step 1 of signup: submits details, triggers an emailed code. No account
// exists yet and no session is created - call verifyEmail() to finish.
export async function register(input: RegisterInput): Promise<{ email: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function resendVerificationCode(email: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handle(res);
}

// Step 2 of signup: confirms the emailed code, creates the account, and logs in.
export async function verifyEmail(email: string, code: string): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await handle<{ token: string; user: CurrentUser }>(res);
  setSession(data.token, data.user);
  return data.user;
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handle<{ token: string; user: CurrentUser }>(res);
  setSession(data.token, data.user);
  return data.user;
}

export async function forgotPassword(username: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return handle(res);
}

export async function resetPassword(username: string, code: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, code, newPassword }),
  });
  return handle(res);
}

// ---------- Account center ----------

export async function fetchAccount(): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders() });
  const data = await handle<{ user: CurrentUser }>(res);
  return data.user;
}

export type AccountUpdateInput = Partial<Pick<RegisterInput, 'firstName' | 'lastName' | 'address' | 'dateOfBirth'>>;

export async function updateAccount(input: AccountUpdateInput): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE_URL}/api/account`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handle<{ user: CurrentUser }>(res);
  const token = getToken();
  if (token) setSession(token, data.user);
  return data.user;
}

// ---------- Saved bookmarks ----------

export function fetchSaved(): Promise<ApiListing[]> {
  return fetch(`${API_BASE_URL}/api/saved`, { headers: authHeaders() }).then((res) => handle(res));
}

export function saveListing(listingId: string): Promise<{ saved: boolean }> {
  return fetch(`${API_BASE_URL}/api/saved`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ listingId }),
  }).then((res) => handle(res));
}

export function unsaveListing(listingId: string): Promise<void> {
  return fetch(`${API_BASE_URL}/api/saved`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ listingId }),
  }).then((res) => handle(res));
}

// ---------- Ratings ----------
export type RatingInfo = { avgRating: number | null; ratingCount: number; yourRating: number | null };

export async function fetchRating(listingId: string): Promise<RatingInfo> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/ratings/${listingId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return handle(res);
}

export async function submitRating(listingId: string, stars: number): Promise<RatingInfo> {
  const res = await fetch(`${API_BASE_URL}/api/ratings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ listingId, stars }),
  });
  return handle(res);
}

// ---------- Admin ----------
const ADMIN_CODE_KEY = 'wtgs-admin-code';

export function getAdminCode(): string | null {
  return sessionStorage.getItem(ADMIN_CODE_KEY);
}

export function setAdminCode(code: string) {
  sessionStorage.setItem(ADMIN_CODE_KEY, code);
}

export function clearAdminCode() {
  sessionStorage.removeItem(ADMIN_CODE_KEY);
}

export async function verifyAdminCode(code: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return res.ok;
}

export type ListingInput = {
  id: string;
  name: string;
  category: string;
  area: string;
  description: string;
  hours: string;
  phone: string;
  rating: string;
  price: string;
  tag?: string;
  imageBase64?: string;
  imageMime?: string;
  imageUrl?: string;
  logoBase64?: string;
  logoMime?: string;
  logoUrl?: string;
  menuBase64?: string;
  menuMime?: string;
  menuUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  clearImage?: boolean;
  clearLogo?: boolean;
  clearMenu?: boolean;
};

function adminHeaders() {
  return { 'Content-Type': 'application/json', 'x-admin-code': getAdminCode() || '' };
}

export async function createListing(input: ListingInput): Promise<ApiListing> {
  const res = await fetch(`${API_BASE_URL}/api/listings`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function updateListing(id: string, input: Partial<ListingInput>): Promise<ApiListing> {
  const res = await fetch(`${API_BASE_URL}/api/listings/${id}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function deleteListing(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/listings/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  return handle(res);
}

// ---------- Sub-galleries (up to 3 extra photos) ----------
// Shared shape used for both listings and gallery_items (nature entries).
export type SubGalleryPhoto = { position: number; hasImage: boolean; imageUrl: string | null };
export type SubGallerySlotInput = { position: number; imageBase64?: string; imageMime?: string; imageUrl?: string; clear?: boolean };

export function listingGalleryImageUrlFor(listingId: string, position: number): string {
  return `${API_BASE_URL}/api/listings/${listingId}/gallery/${position}/image`;
}

export function fetchListingGallery(listingId: string): Promise<SubGalleryPhoto[]> {
  return fetch(`${API_BASE_URL}/api/listings/${listingId}/gallery`).then((res) => handle(res));
}

export async function updateListingGallery(listingId: string, images: SubGallerySlotInput[]): Promise<SubGalleryPhoto[]> {
  const res = await fetch(`${API_BASE_URL}/api/listings/${listingId}/gallery`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify({ images }),
  });
  return handle(res);
}

export function galleryItemSubGalleryImageUrlFor(itemId: number, position: number): string {
  return `${API_BASE_URL}/api/gallery/${itemId}/gallery/${position}/image`;
}

export function fetchGalleryItemGallery(itemId: number): Promise<SubGalleryPhoto[]> {
  return fetch(`${API_BASE_URL}/api/gallery/${itemId}/gallery`).then((res) => handle(res));
}

export async function updateGalleryItemGallery(itemId: number, images: SubGallerySlotInput[]): Promise<SubGalleryPhoto[]> {
  const res = await fetch(`${API_BASE_URL}/api/gallery/${itemId}/gallery`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify({ images }),
  });
  return handle(res);
}

// ---------- Gallery items ("A few places we love" / "Where to go nature") ----------
export type GalleryKind = 'featured' | 'nature' | 'history';

export type GalleryItem = {
  id: number;
  name: string;
  location: string;
  details: string | null;
  hasImage: boolean;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number | null;
};

export type GalleryItemInput = {
  kind: GalleryKind;
  name: string;
  location: string;
  details?: string;
  imageBase64?: string;
  imageMime?: string;
  imageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  sortOrder?: number | null;
};

export function galleryImageUrlFor(id: number): string {
  return `${API_BASE_URL}/api/gallery/image/${id}`;
}

export function fetchGallery(kind: GalleryKind): Promise<GalleryItem[]> {
  return fetch(`${API_BASE_URL}/api/gallery/${kind}`).then((res) => handle(res));
}

export async function createGalleryItem(input: GalleryItemInput): Promise<GalleryItem> {
  const res = await fetch(`${API_BASE_URL}/api/gallery`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function updateGalleryItem(id: number, input: Partial<Omit<GalleryItemInput, 'kind'>>): Promise<GalleryItem> {
  const res = await fetch(`${API_BASE_URL}/api/gallery/${id}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function deleteGalleryItem(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/gallery/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  return handle(res);
}

export type Category = {
  id: string;
  name: string;
};

export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(apiUrlFor('/api/categories'));

  if (!response.ok) {
    throw new Error('Could not load categories.');
  }

  return response.json();
}

export async function createCategory(name: string): Promise<Category> {
  const response = await fetch(apiUrlFor('/api/categories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || 'Could not create category.');
  }

  return response.json();
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const response = await fetch(apiUrlFor(`/api/categories/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || 'Could not rename category.');
  }

  return response.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(apiUrlFor(`/api/categories/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || 'Could not delete category.');
  }
}
