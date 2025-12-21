import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";

/**
 * Provider leaks page component that displays all prompts from a specific provider.
 * Features:
 * - Search/filter by target name
 * - Filter by target type
 * - Expandable prompt cards with full details
 * - Copy to clipboard functionality
 */
export default function ProviderLeaks() {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();
  const decodedProvider = provider ? decodeURIComponent(provider) : "";

  const leaks = useQuery(
    api.leaks.getLeaksByProvider,
    decodedProvider ? { provider: decodedProvider } : "skip"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedLeaks, setExpandedLeaks] = useState<Set<string>>(new Set());
  const [copiedLeakId, setCopiedLeakId] = useState<string | null>(null);

  // Get unique target types from leaks
  const targetTypes = useMemo(() => {
    if (!leaks) return [];
    const types = new Set(leaks.map((leak) => leak.targetType));
    return Array.from(types);
  }, [leaks]);

  // Filter leaks based on search and type filter
  const filteredLeaks = useMemo(() => {
    if (!leaks) return [];

    let filtered = leaks;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (leak) =>
          leak.targetName.toLowerCase().includes(query) ||
          leak.leakText.toLowerCase().includes(query) ||
          (leak.leakContext && leak.leakContext.toLowerCase().includes(query))
      );
    }

    // Filter by target type
    if (selectedType !== "all") {
      filtered = filtered.filter((leak) => leak.targetType === selectedType);
    }

    return filtered;
  }, [leaks, searchQuery, selectedType]);

  // Toggle expanded state for a leak
  const toggleExpanded = (leakId: string) => {
    setExpandedLeaks((prev) => {
      const next = new Set(prev);
      if (next.has(leakId)) {
        next.delete(leakId);
      } else {
        next.add(leakId);
      }
      return next;
    });
  };

  // Expand all leaks
  const expandAll = () => {
    if (!filteredLeaks) return;
    setExpandedLeaks(new Set(filteredLeaks.map((leak) => leak._id)));
  };

  // Collapse all leaks
  const collapseAll = () => {
    setExpandedLeaks(new Set());
  };

  // Copy prompt to clipboard
  const copyPrompt = async (text: string, leakId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLeakId(leakId);
      setTimeout(() => setCopiedLeakId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Get emoji for target type
  const getTargetTypeEmoji = (type: string) => {
    switch (type) {
      case "model":
        return "🤖";
      case "app":
        return "📱";
      case "tool":
        return "🔧";
      case "agent":
        return "🕵️";
      case "plugin":
        return "🔌";
      case "custom":
        return "⚙️";
      default:
        return "📦";
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading state
  if (leaks === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00ff88]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/browse")}
          className="flex items-center gap-2 text-[#888] hover:text-[#00ff88] transition-colors group"
        >
          <svg
            className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back to Browse</span>
        </button>
      </div>

      {/* Provider Header */}
      <div className="bg-linear-to-r from-[#00ff88]/10 via-[#00aaff]/10 to-[#ff00ff]/10 border border-[#00ff88]/30 rounded-2xl p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#e0e0e0] mb-2">
              {decodedProvider}
            </h1>
            <p className="text-[#888]">
              {leaks.length} verified prompt{leaks.length !== 1 ? "s" : ""}{" "}
              available
            </p>
          </div>
          <div className="flex gap-2">
            {targetTypes.map((type) => (
              <span
                key={type}
                className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-sm text-[#aaa] flex items-center gap-1.5"
              >
                <span>{getTargetTypeEmoji(type)}</span>
                <span className="capitalize">{type}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
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
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#00ff88]/50 focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedType === "all"
                ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                : "bg-white/5 text-[#888] border border-white/10 hover:border-white/30"
            }`}
          >
            All
          </button>
          {targetTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                selectedType === type
                  ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                  : "bg-white/5 text-[#888] border border-white/10 hover:border-white/30"
              }`}
            >
              <span>{getTargetTypeEmoji(type)}</span>
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expand/Collapse Controls */}
      <div className="flex items-center justify-between">
        <p className="text-[#888] text-sm">
          Showing {filteredLeaks.length} of {leaks.length} prompts
        </p>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-[#00aaff] hover:text-[#33bbff] transition-colors"
          >
            Expand all
          </button>
          <span className="text-[#666]">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-[#00aaff] hover:text-[#33bbff] transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Leaks List */}
      {filteredLeaks.length === 0 ? (
        <div className="text-center py-12 bg-white/3 border border-white/10 rounded-2xl">
          <div className="text-6xl mb-4">🔎</div>
          <p className="text-[#888] text-xl mb-2">No prompts found</p>
          <p className="text-[#666] text-sm">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaks.map((leak) => {
            const isExpanded = expandedLeaks.has(leak._id);
            return (
              <div
                key={leak._id}
                className="bg-white/3 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
              >
                {/* Leak Header - Always visible */}
                <div
                  onClick={() => toggleExpanded(leak._id)}
                  className="p-5 cursor-pointer flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span
                      className="text-[#00aaff] transition-transform duration-200 shrink-0"
                      style={{
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      ▶
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-[#e0e0e0] truncate">
                          {leak.targetName}
                        </h3>
                        <span className="bg-white/10 text-[#aaa] px-2 py-0.5 rounded text-xs flex items-center gap-1 shrink-0">
                          <span>{getTargetTypeEmoji(leak.targetType)}</span>
                          <span className="capitalize">{leak.targetType}</span>
                        </span>
                      </div>
                      <p className="text-[#666] text-sm mt-1">
                        Added {formatDate(leak._creationTime)}
                        {leak.submitterName && ` by ${leak.submitterName}`}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 shrink-0">
                    {leak.requiresLogin && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
                        🔐 Login
                      </span>
                    )}
                    {leak.isPaid && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                        💰 Paid
                      </span>
                    )}
                    {leak.hasToolPrompts && (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                        🔧 Tools
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-5 space-y-4 bg-black/20">
                    {/* Verification Info */}
                    {(leak.submitterName || leak.verifierNames) && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        {leak.submitterName && (
                          <div className="text-xs text-green-400 mb-1">
                            <span className="font-semibold">Submitted by:</span>{" "}
                            {leak.submitterName}
                          </div>
                        )}
                        {leak.verifierNames && leak.verifierNames.length > 0 && (
                          <div className="text-xs text-green-400">
                            <span className="font-semibold">✓ Verified by:</span>{" "}
                            {leak.verifierNames.join(", ")}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prompt Text */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#00aaff] text-sm font-semibold">
                          System Prompt:
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyPrompt(leak.leakText, leak._id);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#00aaff]/20 hover:bg-[#00aaff]/30 text-[#00aaff] transition-colors flex items-center gap-1.5"
                        >
                          {copiedLeakId === leak._id ? (
                            <>
                              <span>✓</span>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <span>📋</span>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-lg p-4 max-h-96 overflow-auto">
                        <pre className="text-[#ccc] text-sm whitespace-pre-wrap font-mono break-words">
                          {leak.leakText}
                        </pre>
                      </div>
                    </div>

                    {/* Context */}
                    {leak.leakContext && (
                      <div>
                        <span className="text-[#00aaff] text-sm font-semibold block mb-2">
                          Context:
                        </span>
                        <p className="text-[#aaa] text-sm">{leak.leakContext}</p>
                      </div>
                    )}

                    {/* URL */}
                    {leak.url && (
                      <div>
                        <span className="text-[#00aaff] text-sm font-semibold block mb-2">
                          Source URL:
                        </span>
                        <a
                          href={leak.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#33bbff] text-sm hover:underline break-all inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {leak.url}
                          <svg
                            className="w-4 h-4 shrink-0"
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
                        </a>
                      </div>
                    )}

                    {/* Access Notes */}
                    {leak.accessNotes && (
                      <div>
                        <span className="text-[#00aaff] text-sm font-semibold block mb-2">
                          Access Notes:
                        </span>
                        <p className="text-[#aaa] text-sm">{leak.accessNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

