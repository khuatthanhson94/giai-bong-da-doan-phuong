import { getFullUrl } from '../utils/url';

export default function StandingsTable({ standings, compact = false }) {
  const cols = compact
    ? ['#', 'Đội', 'Tr', 'Đ']
    : ['#', 'Đội', 'Tr', 'T', 'H', 'B', 'BT', 'BB', 'HS', 'Đ'];

  return (
    <div className="overflow-x-auto">
      <table className="table-styled">
        <thead>
          <tr>
            {cols.map((c) => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team_id} className={i < 2 ? 'bg-green-50/50' : ''}>
              <td className="font-bold">{i + 1}</td>
              <td>
                <div className="flex items-center gap-2">
                  {s.logo ? (
                    <img
                      src={getFullUrl(s.logo)}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: s.jersey_color || '#0066CC' }}
                    >
                      {s.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="font-medium">{s.name}</span>
                </div>
              </td>
              <td>{s.played}</td>
              {!compact && (
                <>
                  <td>{s.won}</td>
                  <td>{s.drawn}</td>
                  <td>{s.lost}</td>
                  <td>{s.goals_for}</td>
                  <td>{s.goals_against}</td>
                  <td className={s.goal_diff > 0 ? 'text-green-600 font-semibold' : s.goal_diff < 0 ? 'text-red-600' : ''}>
                    {s.goal_diff > 0 ? '+' : ''}{s.goal_diff}
                  </td>
                </>
              )}
              <td className="font-bold text-primary">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
