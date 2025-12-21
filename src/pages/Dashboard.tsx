import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const user = useQuery(api.users.currentUser);
  const closeRequest = useMutation(api.requests.closeRequest);
  const [error, setError] = useState<string | null>(null);

  // Get user dashboard data - use "skip" to prevent execution until user is loaded
  const userDashboardData = useQuery(
    api.users.getUserDashboardData,
    user ? { userId: user._id } : "skip",
  );

  const handleCloseRequest = async (requestId: string) => {
    try {
      const result = await closeRequest({ requestId: requestId as any });
      
      // Check if the mutation returned an error
      if (!result.success) {
        setError(result.error);
        return;
      }
      
      // Success - clear any previous errors
      setError(null);
    } catch (error) {
      // Fallback for unexpected errors
      console.error("Error closing request:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to close request. Please try again.",
      );
    }
  };

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  if (!userDashboardData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00ff88]"></div>
      </div>
    );
  }

  const leaksCount = userDashboardData.leaks?.length || 0;
  const requestsCount = userDashboardData.requests?.length || 0;

  // Combine leaks and requests into a single activity list
  type ActivityItem =
    | {
        type: "leak";
        _id: string;
        _creationTime: number;
        targetName: string;
        targetType: string;
        provider: string;
        isFullyVerified: boolean;
      }
    | {
        type: "request";
        _id: string;
        _creationTime: number;
        targetName: string;
        targetType: string;
        provider: string;
        closed: boolean;
        targetUrl?: string;
      };

  const activityItems: ActivityItem[] = [
    ...(userDashboardData.leaks || []).map((leak) => ({
      type: "leak" as const,
      ...leak,
    })),
    ...(userDashboardData.requests || []).map((request) => ({
      type: "request" as const,
      ...request,
    })),
  ].sort((a, b) => b._creationTime - a._creationTime); // Sort by most recent first

  // Helper function to format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold bg-linear-to-r from-[#00ff88] via-[#00aaff] to-[#ff00ff] bg-clip-text text-transparent mb-2">
            Welcome back, {userDashboardData.name}!
          </h2>
          <p className="text-[#888] text-lg">{userDashboardData.email}</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Points Display - Prominent */}
      <div className="bg-linear-to-r from-[#00ff88]/10 via-[#00aaff]/10 to-[#ff00ff]/10 border-2 border-[#00ff88]/30 rounded-2xl p-8 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-[#888] text-sm uppercase tracking-wider mb-2">
            Total Points
          </div>
          <div className="text-6xl font-bold bg-linear-to-r from-[#00ff88] via-[#00aaff] to-[#ff00ff] bg-clip-text text-transparent">
            {userDashboardData.points}
          </div>
          <div className="text-[#888] text-sm mt-2">
            Rank #{userDashboardData.rank} of {userDashboardData.totalUsers}
          </div>
          <div className="text-[#888] text-xs mt-1">
            Keep contributing to earn more!
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaks Stats */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-[#00ff88]/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-[#00ff88]/20 rounded-full p-4">
              <svg
                className="w-8 h-8 text-[#00ff88]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00ff88]">
                {leaksCount}
              </div>
              <div className="text-[#888] text-sm">Submitted Leaks</div>
            </div>
          </div>
        </div>

        {/* Requests Stats */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-[#00aaff]/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-[#00aaff]/20 rounded-full p-4">
              <svg
                className="w-8 h-8 text-[#00aaff]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00aaff]">
                {requestsCount}
              </div>
              <div className="text-[#888] text-sm">Requests Made</div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-[#00aaff] mb-4">📊 Activity</h3>
        {activityItems.length === 0 ? (
          <div className="text-center py-8 text-[#888]">
            <p className="text-lg mb-2">No activity yet</p>
            <p className="text-sm">
              Start contributing by submitting leaks or creating requests!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activityItems.map((item) => (
              <div
                key={`${item.type}-${item._id}`}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon */}
                    <div
                      className={`rounded-full p-2 mt-1 ${
                        item.type === "leak"
                          ? "bg-[#00ff88]/20"
                          : "bg-[#00aaff]/20"
                      }`}
                    >
                      {item.type === "leak" ? (
                        <svg
                          className="w-5 h-5 text-[#00ff88]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-[#00aaff]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold ${
                            item.type === "leak"
                              ? "text-[#00ff88]"
                              : "text-[#00aaff]"
                          }`}
                        >
                          {item.type === "leak"
                            ? "Submitted Leak"
                            : "Created Request"}
                        </span>
                        {item.type === "leak" && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              item.isFullyVerified
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            }`}
                          >
                            {item.isFullyVerified ? "✓ Verified" : "Pending"}
                          </span>
                        )}
                        {item.type === "request" && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              item.closed
                                ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {item.closed ? "Closed" : "Open"}
                          </span>
                        )}
                      </div>
                      <p className="text-[#e0e0e0] font-medium mt-1">
                        {item.targetName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-[#888]">
                        <span className="capitalize">{item.targetType}</span>
                        <span>•</span>
                        <span>{item.provider}</span>
                      </div>
                      {item.type === "request" && item.targetUrl && (
                        <a
                          href={item.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-[#00aaff] hover:text-[#00ccff] transition-colors"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          <span className="truncate max-w-[200px]">
                            {item.targetUrl}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Timestamp and Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-[#888] whitespace-nowrap">
                      {formatDate(item._creationTime)}
                    </div>
                    {item.type === "request" && !item.closed && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2 text-xs"
                          >
                            Close
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Close Request</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to close this request? This
                              action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button
                              onClick={() => handleCloseRequest(item._id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Close Request
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-[#00aaff] mb-4">
          ⚡ Quick Actions
        </h3>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => navigate("/")}
            className="bg-linear-to-r from-[#00ff88] to-[#00aaff] text-black px-6 py-3 rounded-lg font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(0,255,136,0.4)]"
          >
            📝 Submit New Leak
          </button>
          <button
            onClick={() => navigate("/browse")}
            className="bg-white/10 border border-white/20 text-[#e0e0e0] px-6 py-3 rounded-lg font-bold transition-all hover:bg-white/20 hover:border-[#00ff88]/50"
          >
            🔍 Browse Prompts
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="bg-white/10 border border-white/20 text-[#e0e0e0] px-6 py-3 rounded-lg font-bold transition-all hover:bg-white/20 hover:border-[#ff00ff]/50"
          >
            🏆 View Leaderboard
          </button>
          <button
            onClick={() => navigate("/requests")}
            className="bg-white/10 border border-white/20 text-[#e0e0e0] px-6 py-3 rounded-lg font-bold transition-all hover:bg-white/20 hover:border-[#00aaff]/50"
          >
            🎯 Browse Requests
          </button>
        </div>
      </div>
    </div>
  );
}
