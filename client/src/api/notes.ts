import { apiClient } from './httpClient';

export const notesApi = {
  async listByCase(caseId: string) {
    const response = await apiClient.get(`/notes/case/${caseId}`);
    return response.data;
  },

  async create(payload: { caseId: string; content: string; noteType?: string; isPrivate?: boolean; parentNoteId?: string | null }) {
    const response = await apiClient.post('/notes', payload);
    return response.data;
  },

  async reply(noteId: string, content: string) {
    const response = await apiClient.post(`/notes/${noteId}/reply`, { content });
    return response.data;
  },

  async setPinned(noteId: string, pinned: boolean) {
    const response = await apiClient.patch(`/notes/${noteId}/pin`, { pinned });
    return response.data;
  },

  async remove(noteId: string) {
    const response = await apiClient.delete(`/notes/${noteId}`);
    return response.data;
  }
};
