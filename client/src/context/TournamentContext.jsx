import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const [seasons, setSeasons] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(
    localStorage.getItem("v3_selected_season_id") ? Number(localStorage.getItem("v3_selected_season_id")) : null
  );
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    localStorage.getItem("v3_selected_tournament_id") ? Number(localStorage.getItem("v3_selected_tournament_id")) : null
  );
  const [loading, setLoading] = useState(true);

  // Load all seasons on mount
  const loadSeasons = async () => {
    try {
      const data = await api.get("/seasons");
      setSeasons(data || []);
      
      // Select default season if none selected
      if (data && data.length > 0) {
        const hasSavedSeason = data.find(s => s.id === selectedSeasonId);
        if (!hasSavedSeason) {
          const activeSeason = data.find(s => s.status === 'active') || data[0];
          setSelectedSeasonId(activeSeason.id);
          localStorage.setItem("v3_selected_season_id", activeSeason.id);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to load seasons:", err);
      setLoading(false);
    }
  };

  // Load tournaments when selectedSeasonId changes
  const loadTournaments = async (seasonId) => {
    if (!seasonId) return;
    try {
      const data = await api.get(`/tournaments?season_id=${seasonId}`);
      setTournaments(data || []);
      
      if (data && data.length > 0) {
        const hasSavedTournament = data.find(t => t.id === selectedTournamentId);
        if (!hasSavedTournament) {
          const activeTour = data.find(t => t.status === 'active') || data[0];
          setSelectedTournamentId(activeTour.id);
          localStorage.setItem("v3_selected_tournament_id", activeTour.id);
        }
      } else {
        setSelectedTournamentId(null);
        localStorage.removeItem("v3_selected_tournament_id");
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load tournaments:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadTournaments(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const changeSeason = (seasonId) => {
    const sId = Number(seasonId);
    setSelectedSeasonId(sId);
    localStorage.setItem("v3_selected_season_id", sId);
    // Reset selected tournament to trigger reload
    setSelectedTournamentId(null);
    localStorage.removeItem("v3_selected_tournament_id");
    
    // Reload page to re-fetch all API data with new context
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const changeTournament = (tournamentId) => {
    const tId = tournamentId ? Number(tournamentId) : null;
    setSelectedTournamentId(tId);
    if (tId) {
      localStorage.setItem("v3_selected_tournament_id", tId);
    } else {
      localStorage.removeItem("v3_selected_tournament_id");
    }

    // Reload page to re-fetch all API data with new context
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const reloadData = async () => {
    setLoading(true);
    await loadSeasons();
    if (selectedSeasonId) {
      await loadTournaments(selectedSeasonId);
    }
  };

  return (
    <TournamentContext.Provider
      value={{
        seasons,
        tournaments,
        selectedSeasonId,
        selectedTournamentId,
        changeSeason,
        changeTournament,
        loading,
        reloadData
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error("useTournament must be used within a TournamentProvider");
  }
  return context;
}
