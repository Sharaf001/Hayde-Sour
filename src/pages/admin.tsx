import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiUrlFor,
  clearAdminCode,
  createGalleryItem,
  createListing,
  deleteGalleryItem,
  deleteListing,
  fetchGallery,
  fetchGalleryItemGallery,
  fetchListingGallery,
  fetchListings,
  galleryImageUrlFor,
  galleryItemSubGalleryImageUrlFor,
  getAdminCode,
  imageUrlFor,
  logoUrlFor,
  menuUrlFor,
  isLoggedIn,
  listingGalleryImageUrlFor,
  logout,
  resolveImageSrc,
  setAdminCode,
  updateGalleryItem,
  updateGalleryItemGallery,
  updateListing,
  updateListingGallery,
  verifyAdminCode,
  type GalleryItem,
  type GalleryItemInput,
  type GalleryKind,
  type ListingInput,
  type SubGalleryPhoto,
  type SubGallerySlotInput,
} from '@/lib/api';
import { ImageInput, type ImageInputValue } from '@/components/image-input';

type AdminCategory = {
  id: string;
  name: string;
};

async function readApiError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return data?.error || data?.message || fallback;
}

function adminRequestHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-code': getAdminCode() || '',
  };
}

async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const response = await fetch(apiUrlFor('/api/categories'));

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Could not load categories.'));
  }

  return response.json();
}

async function createAdminCategory(name: string): Promise<AdminCategory> {
  const response = await fetch(apiUrlFor('/api/categories'), {
    method: 'POST',
    headers: adminRequestHeaders(),
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Could not create category.'));
  }

  return response.json();
}

async function renameAdminCategory(id: string, name: string): Promise<AdminCategory> {
  const response = await fetch(apiUrlFor(`/api/categories/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: adminRequestHeaders(),
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Could not rename category.'));
  }

  return response.json();
}

async function deleteAdminCategory(id: string): Promise<void> {
  const response = await fetch(apiUrlFor(`/api/categories/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      'x-admin-code': getAdminCode() || '',
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Could not delete category.'));
  }
}

const emptyForm: ListingInput = {
  id: '',
  name: '',
  category: '',
  area: '',
  description: '',
  hours: '',
  phone: '',
  rating: '',
  price: '',
  tag: '',
};

const emptyImage: ImageInputValue = { file: null, url: '' };

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mime: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function resolveImageValue(value: ImageInputValue): Promise<{ imageBase64?: string; imageMime?: string; imageUrl?: string }> {
  if (value.url) return { imageUrl: value.url };
  if (value.file) {
    const { base64, mime } = await fileToBase64(value.file);
    return { imageBase64: base64, imageMime: mime };
  }
  return {};
}

export default function AdminPage() {
  const [code, setCode] = useState('');
  const [authed, setAuthed] = useState(() => !!getAdminCode());
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(false);

  // Admin access is separate from regular user accounts - if a normal
  // user navigates here (e.g. via the footer link), sign them out right
  // away so their session isn't left active while the admin panel is open.
  useEffect(() => {
    if (isLoggedIn()) logout();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setAuthError('');
    try {
      const ok = await verifyAdminCode(code);
      if (ok) {
        setAdminCode(code);
        setAuthed(true);
      } else {
        setAuthError('That code is not correct.');
      }
    } catch {
      setAuthError('Could not reach the server. Is the backend running?');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    clearAdminCode();
    setAuthed(false);
    setCode('');
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2e9d8] px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-[#d9cbb2] bg-[#f9f0df] p-8 shadow-sm">
          <p className="font-display text-3xl text-[#183c44]">Admin access</p>
          <p className="mt-2 text-sm text-[#476269]">Enter the admin code to manage listings.</p>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Secret code"
            autoFocus
            className="mt-6 w-full rounded-xl border border-[#cfc0aa] bg-white px-4 py-3 text-sm text-[#183c44] outline-none focus:border-[#183c44]"
            data-testid="input-admin-code"
          />
          {authError && <p className="mt-3 text-sm text-[#c1543f]">{authError}</p>}
          <button
            type="submit"
            disabled={checking || !code}
            className="mt-5 w-full rounded-full bg-[#183c44] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#f9f0df] transition hover:bg-[#24515a] disabled:opacity-50"
            data-testid="button-admin-login"
          >
            {checking ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { data: listings = [], isLoading } = useQuery({ queryKey: ['listings'], queryFn: fetchListings });
  const {
  data: categories = [],
  isLoading: categoriesLoading,
  error: categoriesError,
} = useQuery({
  queryKey: ['categories'],
  queryFn: fetchAdminCategories,
});

const [form, setForm] = useState<ListingInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<(typeof listings)[number] | null>(null);
  const [image, setImage] = useState<ImageInputValue>(emptyImage);
  const [logo, setLogo] = useState<ImageInputValue>(emptyImage);
  const [menu, setMenu] = useState<ImageInputValue>(emptyImage);
  const [clearImage, setClearImage] = useState(false);
  const [clearLogo, setClearLogo] = useState(false);
  const [clearMenu, setClearMenu] = useState(false);
  const [formError, setFormError] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const imagePayload = await resolveImageValue(image);
      const logoPayload = await resolveImageValue(logo);
      const menuPayload = await resolveImageValue(menu);
      const payload = {
        ...form,
        ...imagePayload,
        ...(logoPayload.imageBase64 ? { logoBase64: logoPayload.imageBase64, logoMime: logoPayload.imageMime } : {}),
        ...(logoPayload.imageUrl ? { logoUrl: logoPayload.imageUrl } : {}),
        ...(menuPayload.imageBase64 ? { menuBase64: menuPayload.imageBase64, menuMime: menuPayload.imageMime } : {}),
        ...(menuPayload.imageUrl ? { menuUrl: menuPayload.imageUrl } : {}),
        clearImage,
        clearLogo,
        clearMenu,
      };
      if (editingId) {
        return updateListing(editingId, payload);
      }
      return createListing(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setForm(emptyForm);
      setEditingId(null);
      setEditingListing(null);
      setImage(emptyImage);
      setLogo(emptyImage);
      setMenu(emptyImage);
      setClearImage(false);
      setClearLogo(false);
      setClearMenu(false);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listings'] }),
  });

  const startEdit = (listing: (typeof listings)[number]) => {
    setEditingId(listing.id);
    setEditingListing(listing);
    setForm({
      id: listing.id,
      name: listing.name,
      category: listing.category,
      area: listing.area,
      description: listing.description,
      hours: listing.hours,
      phone: listing.phone,
      rating: listing.rating,
      price: listing.price,
      tag: listing.tag || '',
      instagramUrl: listing.instagramUrl || '',
      websiteUrl: listing.websiteUrl || '',
      latitude: listing.latitude,
      longitude: listing.longitude,
    });
    setImage(emptyImage);
    setLogo(emptyImage);
    setMenu(emptyImage);
    setClearImage(false);
    setClearLogo(false);
    setClearMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingListing(null);
    setForm(emptyForm);
    setImage(emptyImage);
    setLogo(emptyImage);
    setMenu(emptyImage);
    setClearImage(false);
    setClearLogo(false);
    setClearMenu(false);
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-[#f2e9d8] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <p className="font-display text-4xl text-[#183c44]">Admin</p>
          <button onClick={onLogout} className="rounded-full border border-[#183c44] px-4 py-2 text-xs font-bold uppercase tracking-[.1em] text-[#183c44]" data-testid="button-admin-logout">
            Log out
          </button>
        </div>

<ManageCategories
  categories={categories}
  listings={listings}
  isLoading={categoriesLoading}
  error={categoriesError instanceof Error ? categoriesError.message : ''}
/>
        <p className="mt-8 font-display text-2xl text-[#183c44]">Listings</p>

        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
          className="mt-4 rounded-2xl border border-[#d9cbb2] bg-[#f9f0df] p-6"
        >
          <p className="font-display text-xl text-[#183c44]">{editingId ? `Editing ${editingId}` : 'Add a new listing'}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input required disabled={!!editingId} placeholder="id (e.g. rest-3)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm disabled:opacity-60" data-testid="input-listing-id" />
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-name" />
           <select
  required
  value={form.category}
  onChange={(e) => setForm({ ...form, category: e.target.value })}
  disabled={categoriesLoading || categories.length === 0}
  className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm disabled:opacity-60"
  data-testid="select-listing-category"
>
  <option value="" disabled>
    {categoriesLoading ? 'Loading categories…' : 'Select a category'}
  </option>
  {categories.map((category) => (
    <option key={category.id} value={category.name}>
      {category.name}
    </option>
  ))}
</select>
            <input required placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-area" />
            <input required placeholder="Hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-hours" />
            <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-phone" />
            <input required placeholder="Rating (e.g. 4.7)" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-rating" />
            <input placeholder="Tag (optional)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-tag" />
            <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm sm:col-span-2" rows={3} data-testid="input-listing-description" />
            <div>
              {editingListing && resolveImageSrc(editingListing, imageUrlFor(editingListing.id)) && !clearImage && (
                <div className="mb-2 flex items-center gap-2">
                  <img src={resolveImageSrc(editingListing, imageUrlFor(editingListing.id))!} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <button type="button" onClick={() => setClearImage(true)} className="text-[10px] font-bold uppercase text-[#c1543f]" data-testid="button-remove-listing-image">Remove</button>
                </div>
              )}
              {clearImage && <p className="mb-2 text-[11px] text-[#c1543f]">Will be removed on save. <button type="button" className="underline" onClick={() => setClearImage(false)}>Undo</button></p>}
              <ImageInput value={image} onChange={setImage} label="Photo" testIdPrefix="input-listing-image" />
            </div>
            <div>
              {editingListing && resolveImageSrc({ hasImage: editingListing.hasLogo, imageUrl: editingListing.logoUrl }, logoUrlFor(editingListing.id)) && !clearLogo && (
                <div className="mb-2 flex items-center gap-2">
                  <img src={resolveImageSrc({ hasImage: editingListing.hasLogo, imageUrl: editingListing.logoUrl }, logoUrlFor(editingListing.id))!} alt="" className="h-14 w-14 rounded-full border border-[#d7c9b4] bg-white object-contain p-1" />
                  <button type="button" onClick={() => setClearLogo(true)} className="text-[10px] font-bold uppercase text-[#c1543f]" data-testid="button-remove-listing-logo">Remove</button>
                </div>
              )}
              {clearLogo && <p className="mb-2 text-[11px] text-[#c1543f]">Will be removed on save. <button type="button" className="underline" onClick={() => setClearLogo(false)}>Undo</button></p>}
              <ImageInput value={logo} onChange={setLogo} label="Logo (optional)" testIdPrefix="input-listing-logo" />
            </div>
            {(form.category === 'Restaurants' || form.category === 'Cafes') && (
              <div>
                {editingListing && (editingListing.hasMenu || editingListing.menuUrl) && !clearMenu && (
                  <div className="mb-2 flex items-center gap-2">
                    <a href={resolveImageSrc({ hasImage: editingListing.hasMenu, imageUrl: editingListing.menuUrl }, menuUrlFor(editingListing.id))!} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#183c44] underline">Current menu</a>
                    <button type="button" onClick={() => setClearMenu(true)} className="text-[10px] font-bold uppercase text-[#c1543f]" data-testid="button-remove-listing-menu">Remove</button>
                  </div>
                )}
                {clearMenu && <p className="mb-2 text-[11px] text-[#c1543f]">Will be removed on save. <button type="button" className="underline" onClick={() => setClearMenu(false)}>Undo</button></p>}
                <ImageInput value={menu} onChange={setMenu} label="Menu (optional - photo or PDF)" testIdPrefix="input-listing-menu" />
              </div>
            )}
            <input placeholder="Instagram link (optional)" value={form.instagramUrl || ''} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-instagram" />
            <input placeholder="Website link (optional)" value={form.websiteUrl || ''} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-website" />
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Real location (optional)</p>
              <div className="flex gap-2">
                <input type="number" step="any" placeholder="Latitude e.g. 33.2704" value={form.latitude ?? ''} onChange={(e) => setForm({ ...form, latitude: e.target.value === '' ? null : Number(e.target.value) })} className="w-1/2 rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-latitude" />
                <input type="number" step="any" placeholder="Longitude e.g. 35.1952" value={form.longitude ?? ''} onChange={(e) => setForm({ ...form, longitude: e.target.value === '' ? null : Number(e.target.value) })} className="w-1/2 rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid="input-listing-longitude" />
              </div>
              <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-[#476269] underline">Find coordinates on Google Maps (right-click a spot → "What's here?") - use the plain decimal numbers shown, e.g. 33.2704, not the °'" format.</a>
            </div>
          </div>
          {formError && <p className="mt-3 text-sm text-[#c1543f]">{formError}</p>}
          <div className="mt-5 flex gap-3">
            <button type="submit" disabled={saveMutation.isPending} className="rounded-full bg-[#183c44] px-5 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#f9f0df] disabled:opacity-50" data-testid="button-save-listing">
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add listing'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-[#183c44] px-5 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#183c44]" data-testid="button-cancel-edit">
                Cancel
              </button>
            )}
          </div>
        </form>

        {editingId && (
          <div className="mt-6">
            <SubGalleryManager
              title="Extra photos (up to 3)"
              fetchFn={() => fetchListingGallery(editingId)}
              saveFn={(images) => updateListingGallery(editingId, images)}
              imageUrlFn={(position) => listingGalleryImageUrlFor(editingId, position)}
              queryKey={['listing-gallery', editingId]}
            />
          </div>
        )}

        <div className="mt-8">
          <p className="font-display text-xl text-[#183c44]">All listings {isLoading ? '' : `(${listings.length})`}</p>
          <div className="mt-4 space-y-2">
            {listings.map((listing) => {
              const src = resolveImageSrc(listing, imageUrlFor(listing.id));
              return (
                <div key={listing.id} className="flex items-center gap-4 rounded-xl border border-[#d9cbb2] bg-[#f9f0df] p-3" data-testid={`row-listing-${listing.id}`}>
                  {src && <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-[#183c44]">{listing.name}</p>
                    <p className="truncate text-xs text-[#476269]">{listing.id} · {listing.category} · {listing.area}</p>
                  </div>
                  <button onClick={() => startEdit(listing)} className="rounded-full border border-[#183c44] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#183c44]" data-testid={`button-edit-${listing.id}`}>
                    Edit
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete ${listing.name}?`)) deleteMutation.mutate(listing.id); }}
                    className="rounded-full border border-[#c1543f] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#c1543f]"
                    data-testid={`button-delete-${listing.id}`}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-14 border-t border-[#d9cbb2] pt-10">
          <GalleryManager kind="featured" title={'"A few places we love" (homepage)'} hint="Up to 3 shown, ordered by the number below." withSubGallery={false} />
        </div>
        <div className="mt-14">
          <GalleryManager kind="nature" title={'"Where to go nature" (gallery page)'} hint="Any number shown, in a photo grid." withSubGallery />
        </div>
      </div>
    </div>
  );
}

const emptyGalleryForm = { name: '', location: '', sortOrder: '' as number | '', latitude: null as number | null, longitude: null as number | null };

function GalleryManager({ kind, title, hint, withSubGallery }: { kind: GalleryKind; title: string; hint: string; withSubGallery: boolean }) {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ['gallery', kind], queryFn: () => fetchGallery(kind) });
  const [form, setForm] = useState(emptyGalleryForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [image, setImage] = useState<ImageInputValue>(emptyImage);
  const [formError, setFormError] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const imagePayload = await resolveImageValue(image);
      const sortOrder = form.sortOrder === '' ? null : Number(form.sortOrder);
      if (editingId) {
        return updateGalleryItem(editingId, { name: form.name, location: form.location, sortOrder, latitude: form.latitude, longitude: form.longitude, ...imagePayload });
      }
      const input: GalleryItemInput = { kind, name: form.name, location: form.location, sortOrder, latitude: form.latitude, longitude: form.longitude, ...imagePayload };
      return createGalleryItem(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', kind] });
      setForm(emptyGalleryForm);
      setEditingId(null);
      setImage(emptyImage);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteGalleryItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gallery', kind] }),
  });

  const startEdit = (item: GalleryItem) => {
    setEditingId(item.id);
    setForm({ name: item.name, location: item.location, sortOrder: item.sortOrder ?? '', latitude: item.latitude, longitude: item.longitude });
    setImage(emptyImage);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyGalleryForm);
    setImage(emptyImage);
    setFormError('');
  };

  return (
    <div>
      <p className="font-display text-2xl text-[#183c44]">{title}</p>
      <p className="mt-1 text-xs text-[#476269]">{hint}</p>

      <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="mt-4 rounded-2xl border border-[#d9cbb2] bg-[#f9f0df] p-6">
        <p className="font-display text-xl text-[#183c44]">{editingId ? 'Editing entry' : 'Add an entry'}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid={`input-gallery-${kind}-name`} />
          <input required placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid={`input-gallery-${kind}-location`} />
          <input type="number" placeholder="Order (optional)" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value === '' ? '' : Number(e.target.value) })} className="rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid={`input-gallery-${kind}-order`} />
          <ImageInput value={image} onChange={setImage} label="Photo" testIdPrefix={`input-gallery-${kind}-image`} />
          <div className="sm:col-span-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#476269]">Real location (optional)</p>
            <div className="flex gap-2">
              <input type="number" step="any" placeholder="Latitude e.g. 33.2704" value={form.latitude ?? ''} onChange={(e) => setForm({ ...form, latitude: e.target.value === '' ? null : Number(e.target.value) })} className="w-1/2 rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid={`input-gallery-${kind}-latitude`} />
              <input type="number" step="any" placeholder="Longitude e.g. 35.1952" value={form.longitude ?? ''} onChange={(e) => setForm({ ...form, longitude: e.target.value === '' ? null : Number(e.target.value) })} className="w-1/2 rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm" data-testid={`input-gallery-${kind}-longitude`} />
            </div>
            <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-[#476269] underline">Find coordinates on Google Maps (right-click a spot → "What's here?") - use the plain decimal numbers shown, e.g. 33.2704, not the °'" format.</a>
          </div>
        </div>
        {formError && <p className="mt-3 text-sm text-[#c1543f]">{formError}</p>}
        <div className="mt-5 flex gap-3">
          <button type="submit" disabled={saveMutation.isPending} className="rounded-full bg-[#183c44] px-5 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#f9f0df] disabled:opacity-50" data-testid={`button-save-gallery-${kind}`}>
            {saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add entry'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="rounded-full border border-[#183c44] px-5 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#183c44]" data-testid={`button-cancel-gallery-${kind}`}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {withSubGallery && editingId && (
        <div className="mt-4">
          <SubGalleryManager
            title="Extra photos (up to 3)"
            fetchFn={() => fetchGalleryItemGallery(editingId)}
            saveFn={(images) => updateGalleryItemGallery(editingId, images)}
            imageUrlFn={(position) => galleryItemSubGalleryImageUrlFor(editingId, position)}
            queryKey={['gallery-item-gallery', editingId]}
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-[#476269]">Loading…</p>}
        {items.map((item) => {
          const src = resolveImageSrc(item, galleryImageUrlFor(item.id));
          return (
            <div key={item.id} className="flex items-center gap-4 rounded-xl border border-[#d9cbb2] bg-[#f9f0df] p-3" data-testid={`row-gallery-${kind}-${item.id}`}>
              {src && <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-[#183c44]">{item.name} {item.sortOrder != null && <span className="ml-1 rounded-full bg-[#f1c575] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#183c44]">#{item.sortOrder}</span>}</p>
                <p className="truncate text-xs text-[#476269]">{item.location}</p>
              </div>
              <button onClick={() => startEdit(item)} className="rounded-full border border-[#183c44] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#183c44]" data-testid={`button-edit-gallery-${kind}-${item.id}`}>
                Edit
              </button>
              <button
                onClick={() => { if (confirm(`Delete ${item.name}?`)) deleteMutation.mutate(item.id); }}
                className="rounded-full border border-[#c1543f] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#c1543f]"
                data-testid={`button-delete-gallery-${kind}-${item.id}`}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shared 3-slot photo manager, used for both a listing's extra gallery
// and a "Where to go nature" entry's extra gallery.
function SubGalleryManager({
  title,
  fetchFn,
  saveFn,
  imageUrlFn,
  queryKey,
}: {
  title: string;
  fetchFn: () => Promise<SubGalleryPhoto[]>;
  saveFn: (images: SubGallerySlotInput[]) => Promise<SubGalleryPhoto[]>;
  imageUrlFn: (position: number) => string;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const { data: photos = [] } = useQuery({ queryKey, queryFn: fetchFn });
  const [slots, setSlots] = useState<Record<number, ImageInputValue>>({});
  const [removeSlots, setRemoveSlots] = useState<Record<number, boolean>>({});

  const saveMutation = useMutation({
    mutationFn: async () => {
      const images: SubGallerySlotInput[] = [];
      for (const position of [1, 2, 3]) {
        if (removeSlots[position]) {
          images.push({ position, clear: true });
          continue;
        }
        const value = slots[position];
        if (value?.url) {
          images.push({ position, imageUrl: value.url });
        } else if (value?.file) {
          const { base64, mime } = await fileToBase64(value.file);
          images.push({ position, imageBase64: base64, imageMime: mime });
        }
      }
      return saveFn(images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSlots({});
      setRemoveSlots({});
    },
  });

  return (
    <div className="rounded-2xl border border-dashed border-[#c9bba5] bg-[#f9f0df]/60 p-5">
      <p className="font-display text-lg text-[#183c44]">{title}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((position) => {
          const existing = photos.find((p) => p.position === position);
          const existingSrc = existing ? resolveImageSrc(existing, imageUrlFn(position)) : null;
          return (
            <div key={position}>
              {existingSrc && !removeSlots[position] && (
                <div className="mb-2 flex items-center gap-2">
                  <img src={existingSrc} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <button type="button" onClick={() => setRemoveSlots({ ...removeSlots, [position]: true })} className="text-[10px] font-bold uppercase text-[#c1543f]" data-testid={`button-remove-subgallery-${position}`}>
                    Remove
                  </button>
                </div>
              )}
              {removeSlots[position] && (
                <p className="mb-2 text-[11px] text-[#c1543f]">Will be removed on save. <button type="button" className="underline" onClick={() => setRemoveSlots({ ...removeSlots, [position]: false })}>Undo</button></p>
              )}
              <ImageInput
                value={slots[position] || emptyImage}
                onChange={(v) => setSlots({ ...slots, [position]: v })}
                label={`Slot ${position}`}
                testIdPrefix={`input-subgallery-${position}`}
              />
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="mt-4 rounded-full bg-[#183c44] px-5 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#f9f0df] disabled:opacity-50" data-testid="button-save-subgallery">
        {saveMutation.isPending ? 'Saving…' : 'Save photos'}
      </button>
    </div>
  );
}

function ManageCategories({
  categories,
  listings,
  isLoading,
  error,
}: {
 categories: AdminCategory[];
  listings: { id: string; category: string }[];
  isLoading: boolean;
  error: string;
}) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminCategory(newName.trim()),
    onSuccess: () => {
      setNewName('');
      setMessage('');
      refresh();
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const renameMutation = useMutation({
    mutationFn: () => renameAdminCategory(editingId!, editingName.trim()),
    onSuccess: () => {
      setEditingId(null);
      setEditingName('');
      setMessage('');
      refresh();
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess: () => {
      setMessage('');
      refresh();
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();

    if (!newName.trim()) {
      setMessage('Enter a category name.');
      return;
    }

    if (categories.some((category) => category.name.toLowerCase() === newName.trim().toLowerCase())) {
      setMessage('A category with this name already exists.');
      return;
    }

    setMessage('');
    createMutation.mutate();
  };

  const handleRename = (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingName.trim()) {
      setMessage('Category name cannot be empty.');
      return;
    }

    setMessage('');
    renameMutation.mutate();
  };

  return (
    <section className="mt-8">
      <p className="font-display text-2xl text-[#183c44]">Manage categories</p>
      <p className="mt-1 text-sm text-[#476269]">
        Rename a category to update all listings assigned to it.
      </p>

      <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#d9cbb2] bg-[#f9f0df] p-5 sm:flex-row">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm"
          data-testid="input-category-name"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-full bg-[#183c44] px-5 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#f9f0df] disabled:opacity-50"
          data-testid="button-create-category"
        >
          {createMutation.isPending ? 'Adding…' : 'Add category'}
        </button>
      </form>

      {(message || error) && (
        <p className="mt-3 text-sm text-[#c1543f]">{message || error}</p>
      )}

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-[#476269]">Loading categories…</p>}

        {!isLoading && categories.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#c9bba5] p-4 text-sm text-[#476269]">
            No categories yet. Add one before creating listings.
          </p>
        )}

        {categories.map((category) => {
          const listingCount = listings.filter((listing) => listing.category === category.name).length;
          const isEditing = editingId === category.id;

          return (
            <div key={category.id} className="rounded-xl border border-[#d9cbb2] bg-[#f9f0df] p-4">
              {isEditing ? (
                <form onSubmit={handleRename} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="flex-1 rounded-lg border border-[#cfc0aa] bg-white px-3 py-2 text-sm"
                    data-testid={`input-rename-category-${category.id}`}
                  />
                  <button
                    type="submit"
                    disabled={renameMutation.isPending}
                    className="rounded-full bg-[#183c44] px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#f9f0df]"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-full border border-[#183c44] px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#183c44]"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="font-semibold text-[#183c44]">{category.name}</p>
                    <p className="text-xs text-[#476269]">
                      {listingCount} {listingCount === 1 ? 'listing' : 'listings'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                      setMessage('');
                    }}
                    className="rounded-full border border-[#183c44] px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#183c44]"
                  >
                    Rename
                  </button>

                  <button
                    type="button"
                    disabled={listingCount > 0 || deleteMutation.isPending}
                    title={listingCount > 0 ? 'Reassign all listings before deleting this category.' : undefined}
                    onClick={() => {
                      if (listingCount > 0) {
                        setMessage(`“${category.name}” cannot be deleted until its ${listingCount} listing(s) are reassigned.`);
                        return;
                      }

                      if (confirm(`Delete the “${category.name}” category?`)) {
                        deleteMutation.mutate(category.id);
                      }
                    }}
                    className="rounded-full border border-[#c1543f] px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#c1543f] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
