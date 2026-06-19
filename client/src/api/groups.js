import { api } from '../api/client';

export const groupsApi = {
  fetchGroups: () => api.get('/groups'),
  createGroup: (name) => api.post('/groups', { name }),
  updateGroup: (id, name) => api.put(`/groups/${id}`, { name }),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  assignTeams: (groupId, teamIds) => api.post(`/groups/${groupId}/teams`, { teamIds }),
  generateGroups: (data) => api.post('/groups/generate', data)
};
