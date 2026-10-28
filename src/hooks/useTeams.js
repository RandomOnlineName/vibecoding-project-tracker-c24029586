/**
 * useTeams — fetch, create, and manage teams.
 * Exposes: { teams, loading, activeTeam, setActiveTeamId, createTeam, fetchTeam, inviteMember, acceptInvite }
 */
import { useState, useEffect, useCallback } from 'react';

const ACTIVE_TEAM_KEY = 'vt_active_team';
const API = '/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export function useTeams(token) {
  const [teams, setTeams]           = useState([]);
  const [activeTeamId, _setActiveTeamId] = useState(() => localStorage.getItem(ACTIVE_TEAM_KEY));
  const [teamDetail, setTeamDetail] = useState(null); // full team with members
  const [loading, setLoading]       = useState(false);

  const setActiveTeamId = useCallback((id) => {
    _setActiveTeamId(id);
    if (id) localStorage.setItem(ACTIVE_TEAM_KEY, id);
    else    localStorage.removeItem(ACTIVE_TEAM_KEY);
  }, []);

  // Load teams list
  const fetchTeams = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/teams`, { headers: authHeaders(token) });
      if (!r.ok) return;
      const data = await r.json();
      setTeams(data);
      // Auto-select the previously active team, or first team
      _setActiveTeamId(prev => {
        const exists = data.find(t => t.id === prev);
        const chosen = exists ? prev : (data[0]?.id ?? null);
        if (chosen) localStorage.setItem(ACTIVE_TEAM_KEY, chosen);
        return chosen;
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // Load active team detail (with members)
  const fetchTeam = useCallback(async (id) => {
    if (!token || !id) return null;
    const r = await fetch(`${API}/teams/${id}`, { headers: authHeaders(token) });
    if (!r.ok) return null;
    const data = await r.json();
    setTeamDetail(data);
    return data;
  }, [token]);

  useEffect(() => {
    if (activeTeamId) fetchTeam(activeTeamId);
  }, [activeTeamId, fetchTeam]);

  const createTeam = useCallback(async (name, description = '') => {
    const r = await fetch(`${API}/teams`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ name, description }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to create team');
    setTeams(prev => [...prev, data]);
    setActiveTeamId(data.id);
    return data;
  }, [token, setActiveTeamId]);

  const inviteMember = useCallback(async (teamId, email) => {
    const r = await fetch(`${API}/teams/${teamId}/invite`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ email }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to send invite');
    // Refresh team detail to pick up any directly-added members
    if (data.added) await fetchTeam(teamId);
    return data;
  }, [token, fetchTeam]);

  const acceptInvite = useCallback(async (inviteToken) => {
    const r = await fetch(`${API}/invitations/accept`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ token: inviteToken }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to accept invite');
    await fetchTeams();
    return data;
  }, [token, fetchTeams]);

  const activeTeam = teams.find(t => t.id === activeTeamId) || null;

  return {
    teams,
    loading,
    activeTeam,
    activeTeamId,
    // Hide stale detail from a previously active team while the new one loads
    teamDetail: teamDetail?.id === activeTeamId ? teamDetail : null,
    setActiveTeamId,
    createTeam,
    fetchTeam,
    fetchTeams,
    inviteMember,
    acceptInvite,
  };
}
