import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";

export default function Leaderboard() {
  const leaderboardData = useQuery(api.leaderboard.getLeaderboard);

  if (!leaderboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#888]">Loading leaderboard...</div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-700" />;
      default:
        return (
          <span className="text-lg font-bold text-[#888] w-6 text-center">
            {rank}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-[#00ff88]" />
          Leaderboard
        </h1>
        <p className="text-[#888]">
          Top contributors ranked by points earned from verified leaks
        </p>
      </div>

      {/* How to Earn Points */}
      <div className="bg-[#1a1a1a] border border-[#00aaff]/20 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-[#00aaff] mb-4 flex items-center gap-2">
          💎 How to Earn Points
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-[#00ff88] mb-2">+100</div>
            <div className="text-white font-semibold mb-1">
              Submit First Leak
            </div>
            <div className="text-sm text-[#888]">
              Be the first to submit a leak for a request that gets verified by
              2 other users
            </div>
          </div>
          <div className="bg-[#00aaff]/5 border border-[#00aaff]/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-[#00aaff] mb-2">+50</div>
            <div className="text-white font-semibold mb-1">Verify a Leak</div>
            <div className="text-sm text-[#888]">
              Confirm someone else's leak by submitting the same information to
              help verify it
            </div>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-500 mb-2">+20</div>
            <div className="text-white font-semibold mb-1">Create Request</div>
            <div className="text-sm text-[#888]">
              Request a leak that gets verified by 2 different users
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-[#00ff88]/5 border border-[#00ff88]/20 rounded text-sm text-[#ccc]">
          <strong className="text-[#00ff88]">💡 Pro Tip:</strong> A leak is
          verified when 2 different users submit the same information. The first
          submitter gets the biggest reward!
        </div>
      </div>

      {/* Top 10 Users */}
      <div className="bg-[#1a1a1a] border border-[#00ff88]/20 rounded-lg overflow-hidden">
        <div className="bg-linear-to-r from-[#00ff88]/10 to-transparent p-4 border-b border-[#00ff88]/20 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Top 10 Contributors
          </h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#00ff88]">
              {leaderboardData.totalUsers.toLocaleString()}
            </div>
            <div className="text-xs text-[#888]">total users</div>
          </div>
        </div>
        <div className="divide-y divide-[#00ff88]/10">
          {leaderboardData.topUsers.map((user) => (
            <div
              key={user._id}
              className={`p-4 flex items-center gap-4 transition-colors hover:bg-[#00ff88]/5 ${
                user.rank <= 3 ? "bg-[#00ff88]/5" : ""
              } ${user.isCurrentUser ? "ring-1 ring-[#00ff88]/40 bg-[#00ff88]/10" : ""}`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-10">
                {getRankIcon(user.rank)}
              </div>

              {/* Avatar */}
              <Avatar className="w-12 h-12 ring-2 ring-[#00ff88]/30">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback className="bg-[#00ff88] text-black font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate flex items-center gap-2">
                  <span className="truncate">{user.name}</span>
                  {user.isCurrentUser && (
                    <span className="text-xs font-semibold bg-[#00ff88] text-black px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <div className="text-sm text-[#888]">Rank #{user.rank}</div>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className="text-2xl font-bold text-[#00ff88]">
                  {user.points.toLocaleString()}
                </div>
                <div className="text-xs text-[#888]">points</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current User Rank (if not in top 10) */}
      {leaderboardData.currentUserRank && (
        <div className="mt-6">
          <div className="bg-linear-to-r from-[#00ff88]/20 to-[#00ff88]/5 border-2 border-[#00ff88]/40 rounded-lg overflow-hidden">
            <div className="bg-[#00ff88]/10 p-3 border-b border-[#00ff88]/30">
              <h3 className="text-lg font-semibold text-white">Your Ranking</h3>
            </div>
            <div className="p-4 flex items-center gap-4">
              {/* Rank */}
              <div className="flex items-center justify-center w-10">
                <span className="text-lg font-bold text-[#00ff88] w-6 text-center">
                  {leaderboardData.currentUserRank.rank}
                </span>
              </div>

              {/* Avatar */}
              <Avatar className="w-12 h-12 ring-2 ring-[#00ff88]/50">
                <AvatarImage
                  src={leaderboardData.currentUserRank.image}
                  alt={leaderboardData.currentUserRank.name}
                />
                <AvatarFallback className="bg-[#00ff88] text-black font-bold">
                  {leaderboardData.currentUserRank.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">
                  {leaderboardData.currentUserRank.name}
                </div>
                <div className="text-sm text-[#888]">
                  Rank #{leaderboardData.currentUserRank.rank}
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className="text-2xl font-bold text-[#00ff88]">
                  {leaderboardData.currentUserRank.points.toLocaleString()}
                </div>
                <div className="text-xs text-[#888]">points</div>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-[#888] mt-3">
            Keep contributing to climb the leaderboard!
          </p>
        </div>
      )}

      {leaderboardData.topUsers.length === 0 && (
        <div className="text-center py-12 text-[#888]">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No users on the leaderboard yet</p>
          <p className="text-sm mt-2">
            Be the first to contribute and earn points!
          </p>
        </div>
      )}
    </div>
  );
}
