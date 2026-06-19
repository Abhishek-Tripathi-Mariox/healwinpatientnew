import { api } from './client';
import type { FamilyMember, PickedImage } from '../state/familyStore';

/**
 * Family members API (/patient/family-members). The backend echoes the body
 * back with a generated `_id`; we map `_id` → `id` for the app. When a photo is
 * picked we send multipart (field `photo`) so the backend can store it.
 */

interface ServerMember {
  _id: string;
  name?: string;
  relation?: string;
  phone?: string;
  age?: string | number;
  gender?: string;
  photo?: string;
}

const toMember = (s: ServerMember): FamilyMember => ({
  id: s._id,
  name: s.name || '',
  relation: s.relation || '',
  phone: s.phone,
  age: s.age != null ? String(s.age) : undefined,
  gender: s.gender,
  photo: s.photo || undefined,
});

const toForm = (m: Partial<FamilyMember>, image: PickedImage): FormData => {
  const form = new FormData();
  if (m.name !== undefined) form.append('name', m.name);
  if (m.relation !== undefined) form.append('relation', m.relation);
  if (m.phone !== undefined) form.append('phone', m.phone);
  if (m.age !== undefined) form.append('age', m.age);
  if (m.gender !== undefined) form.append('gender', m.gender);
  form.append('photo', image as any);
  return form;
};

export const familyApi = {
  async list(): Promise<FamilyMember[]> {
    const data = await api.get<ServerMember[] | { items: ServerMember[] }>('/patient/family-members');
    const arr = Array.isArray(data) ? data : data?.items ?? [];
    return arr.map(toMember);
  },
  async create(m: Omit<FamilyMember, 'id'>, image?: PickedImage): Promise<FamilyMember> {
    const s = image
      ? await api.upload<ServerMember>('/patient/family-members', toForm(m, image), 'POST')
      : await api.post<ServerMember>('/patient/family-members', m);
    return toMember(s);
  },
  async update(id: string, m: Partial<FamilyMember>, image?: PickedImage): Promise<FamilyMember> {
    const s = image
      ? await api.upload<ServerMember>(`/patient/family-members/${id}`, toForm(m, image), 'PUT')
      : await api.put<ServerMember>(`/patient/family-members/${id}`, m);
    return toMember(s);
  },
  remove: (id: string) => api.del(`/patient/family-members/${id}`),
};
