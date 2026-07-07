import { getFullUrl } from '../utils/url';

export default function MatchCard({ match, showScore = false }) {
  const teamA = match.team_a || { name: match.team_a_name, logo: match.team_a_logo };
  const teamB = match.team_b || { name: match.team_b_name, logo: match.team_b_logo };

  return (
    <div className="card p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-youth bg-green-50 px-2 py-1 rounded">
          {match.group?.name || match.group_name ? `${match.group?.name || match.group_name} - ${match.round}` : match.round}
        </span>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          match.status === 'finished' ? 'bg-gray-100 text-gray-600' :
          match.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' :
          'bg-blue-100 text-primary'
        }`}>
          {match.status === 'finished' ? 'Đã kết thúc' : match.status === 'live' ? 'Đang đá' : 'Sắp diễn ra'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <TeamBadge team={teamA} />
          <p className="font-semibold text-sm mt-2">{teamA.name}</p>
        </div>
        <div className="text-center px-4">
          {showScore && match.status === 'finished' ? (
            <div className="text-2xl font-bold text-primary">{match.score_a} - {match.score_b}</div>
          ) : (
            <div className="text-lg font-bold text-gray-400">VS</div>
          )}
          <div className="text-xs text-gray-500 mt-1">{match.match_time}</div>
        </div>
        <div className="flex-1 text-center">
          <TeamBadge team={teamB} />
          <p className="font-semibold text-sm mt-2">{teamB.name}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex justify-between">
        <span>{match.match_date}</span>
        <span>{match.venue}</span>
      </div>
    </div>
  );
}

function TeamBadge({ team }) {
  if (team?.logo) {
    return <img src={getFullUrl(team.logo)} alt="" className="w-12 h-12 mx-auto rounded-full object-cover" />;
  }
  return (
    <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold">
      {team?.name?.charAt(0) || '?'}
    </div>
  );
}

export function Countdown({ targetDate, targetTime }) {
  const target = new Date(`${targetDate}T${targetTime}:00`);
  const now = new Date();
  const diff = target - now;

  if (diff <= 0) return <span className="text-red-500 font-medium">Trận đấu đã/đang diễn ra</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex gap-3 justify-center">
      {[{ v: days, l: 'Ngày' }, { v: hours, l: 'Giờ' }, { v: mins, l: 'Phút' }].map(({ v, l }) => (
        <div key={l} className="text-center">
          <div className="bg-primary text-white w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold">{v}</div>
          <div className="text-xs text-gray-500 mt-1">{l}</div>
        </div>
      ))}
    </div>
  );
}
