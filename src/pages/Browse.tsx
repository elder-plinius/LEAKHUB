import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

/**
 * Browse page component that displays provider cards with search functionality.
 * Each provider card shows:
 * - Provider name
 * - Number of verified leaks
 * - Target types available
 * - Sample target names
 * 
 * Clicking a card navigates to the provider's detailed leaks page.
 */
export default function Browse() {
  const navigate = useNavigate();
  const providers = useQuery(api.leaks.getProviders);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter providers based on search query
  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    if (!searchQuery.trim()) return providers;

    const query = searchQuery.toLowerCase().trim();
    return providers.filter(
      (provider) =>
        provider.provider.toLowerCase().includes(query) ||
        provider.sampleTargets.some((target) =>
          target.toLowerCase().includes(query)
        )
    );
  }, [providers, searchQuery]);

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Loading state
  if (providers === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00ff88]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-linear-to-r from-[#00ff88] via-[#00aaff] to-[#ff00ff] bg-clip-text text-transparent mb-4">
          🔍 Browse Prompts
        </h1>
        <p className="text-[#888] text-lg mb-6">
          Explore verified system prompts from {providers.length} providers
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-[#888]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search providers or targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl py-4 pl-12 pr-4 text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#00ff88]/50 focus:ring-2 focus:ring-[#00ff88]/20 transition-all text-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#888] hover:text-[#e0e0e0] transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[#888] text-sm mt-2 text-center">
            Found {filteredProviders.length} provider
            {filteredProviders.length !== 1 ? "s" : ""} matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Provider Cards Grid */}
      {filteredProviders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔎</div>
          <p className="text-[#888] text-xl mb-2">No providers found</p>
          <p className="text-[#666] text-sm">
            Try a different search term or clear the search
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div
              key={provider.provider}
              onClick={() =>
                navigate(`/browse/${encodeURIComponent(provider.provider)}`)
              }
              className="group bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:bg-white/5 hover:border-[#00ff88]/40 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,255,136,0.15)]"
            >
              {/* Provider Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-[#e0e0e0] group-hover:text-[#00ff88] transition-colors truncate">
                    {provider.provider}
                  </h3>
                  <p className="text-[#666] text-sm mt-1">
                    Updated {formatRelativeTime(provider.latestLeakTime)}
                  </p>
                </div>
                <div className="bg-[#00ff88]/20 text-[#00ff88] px-3 py-1 rounded-full text-sm font-bold ml-2 shrink-0">
                  {provider.leakCount}
                </div>
              </div>

              {/* Sample Targets */}
              <div className="space-y-1">
                <p className="text-[#666] text-xs uppercase tracking-wider">
                  Prompts
                </p>
                <div className="text-[#aaa] text-sm space-y-1">
                  {provider.sampleTargets.slice(0, 3).map((target, idx) => (
                    <div
                      key={idx}
                      className="truncate flex items-center gap-2"
                    >
                      <span className="text-[#00ff88] opacity-60">→</span>
                      <span>{target}</span>
                    </div>
                  ))}
                  {provider.sampleTargets.length > 3 && (
                    <p className="text-[#666] text-xs">
                      +{provider.sampleTargets.length - 3} more
                    </p>
                  )}
                </div>
              </div>

              {/* View Arrow */}
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[#00ff88] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View all prompts
                </span>
                <svg
                  className="w-5 h-5 text-[#00ff88] transform translate-x-0 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      <div className="text-center pt-8 border-t border-white/5">
        <p className="text-[#666] text-sm">
          Total: {providers.reduce((sum, p) => sum + p.leakCount, 0)} verified
          prompts across {providers.length} providers
        </p>
      </div>
    </div>
  );
}

