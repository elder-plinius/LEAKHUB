import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface LeakLibraryProps {
  isUserLoggedIn?: boolean;
}

export function LeakLibrary({ isUserLoggedIn }: LeakLibraryProps) {
  const verifiedLeaks = useQuery(api.leaks.getVerifiedLeaks);
  const requestsWithStatus = useQuery(
    api.requests.getRequestsWithVerificationStatus,
  );
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["verified"]),
  );
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [openLeaks, setOpenLeaks] = useState<Set<string>>(new Set());
  const [copiedLeakId, setCopiedLeakId] = useState<string | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleFolder = (provider: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  const toggleLeak = (leakId: string) => {
    setOpenLeaks((prev) => {
      const next = new Set(prev);
      if (next.has(leakId)) {
        next.delete(leakId);
      } else {
        next.add(leakId);
      }
      return next;
    });
  };

  const copyPrompt = async (text: string, leakId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLeakId(leakId);
      setTimeout(() => setCopiedLeakId(null), 2000);
    } catch (err) {
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }
  };

  const renderRequestSection = (requests: typeof requestsWithStatus) => {
    if (!requests || requests.length === 0) {
      return (
        <p className="text-[#666] text-center py-4">
          No requests awaiting verification yet.
        </p>
      );
    }

    const groupedByProvider = requests.reduce(
      (acc, request) => {
        if (!acc[request.provider]) {
          acc[request.provider] = [];
        }
        acc[request.provider].push(request);
        return acc;
      },
      {} as Record<string, typeof requests>,
    );

    return (
      <div className="space-y-3 pl-4">
        {Object.entries(groupedByProvider).map(
          ([provider, providerRequests]) => {
            const folderKey = `requests-${provider}`;
            const isOpen = openFolders.has(folderKey);
            return (
              <div
                key={folderKey}
                className="border border-white/10 rounded-lg p-4"
              >
                <h3
                  className="text-[#00aaff] text-lg font-semibold mb-3 flex items-center gap-2 cursor-pointer hover:text-[#33bbff] transition-colors"
                  onClick={() => toggleFolder(folderKey)}
                >
                  <span
                    className="transition-transform duration-200"
                    style={{
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  >
                    ▶
                  </span>
                  <span>{isOpen ? "📂" : "📁"}</span>
                  <span>{provider}</span>
                  <span className="text-sm text-[#666]">
                    ({providerRequests.length})
                  </span>
                </h3>
                {isOpen && (
                  <div className="space-y-2 pl-6">
                    {providerRequests.map((request) => {
                      // Determine status color based on confirmations
                      let statusColor = "text-red-400";
                      let statusEmoji = "🔴";
                      if (request.confirmationCount === 1) {
                        statusColor = "text-yellow-400";
                        statusEmoji = "🟡";
                      } else if (request.confirmationCount === 0) {
                        statusColor = "text-red-400";
                        statusEmoji = "🔴";
                      }

                      return (
                        <div
                          key={request._id}
                          className="border border-white/5 rounded-lg p-3 bg-white/5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-[#ccc] font-medium wrap-break-word">
                                {request.targetName}
                              </span>
                              <span className="text-xs text-[#666] bg-white/5 px-2 py-1 rounded shrink-0">
                                {request.targetType}
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 shrink-0 ${statusColor}`}
                            >
                              <span>{statusEmoji}</span>
                              <span className="text-sm font-semibold">
                                {request.confirmationCount}/2
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-[#666]">
                            <div>Requested by: {request.submitterName}</div>
                            {request.uniqueSubmitters > 0 && (
                              <div>
                                Unique submitters: {request.uniqueSubmitters}
                              </div>
                            )}
                            {request.targetUrl && (
                              <div className="mt-1">
                                <a
                                  href={request.targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#33bbff] hover:underline break-all"
                                >
                                  {request.targetUrl}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    );
  };

  const renderLeakSection = (
    leaks: typeof verifiedLeaks,
    sectionPrefix: string,
  ) => {
    if (!leaks || leaks.length === 0) {
      return (
        <p className="text-[#666] text-center py-4">
          No leaks in this section yet.
        </p>
      );
    }

    const groupedByProvider = leaks.reduce(
      (acc, leak) => {
        if (!acc[leak.provider]) {
          acc[leak.provider] = [];
        }
        acc[leak.provider].push(leak);
        return acc;
      },
      {} as Record<string, typeof leaks>,
    );

    return (
      <div className="space-y-3 pl-4">
        {Object.entries(groupedByProvider).map(([provider, providerLeaks]) => {
          const folderKey = `${sectionPrefix}-${provider}`;
          const isOpen = openFolders.has(folderKey);
          return (
            <div
              key={folderKey}
              className="border border-white/10 rounded-lg p-4"
            >
              <h3
                className="text-[#00aaff] text-lg font-semibold mb-3 flex items-center gap-2 cursor-pointer hover:text-[#33bbff] transition-colors"
                onClick={() => toggleFolder(folderKey)}
              >
                <span
                  className="transition-transform duration-200"
                  style={{
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ▶
                </span>
                <span>{isOpen ? "📂" : "📁"}</span>
                <span>{provider}</span>
                <span className="text-sm text-[#666]">
                  ({providerLeaks.length})
                </span>
              </h3>
              {isOpen && (
                <div className="space-y-2 pl-6">
                  {providerLeaks.map((leak) => {
                    const isLeakOpen = openLeaks.has(leak._id);
                    return (
                      <div
                        key={leak._id}
                        className="border border-white/5 rounded-lg p-3 bg-white/5"
                      >
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:text-[#33bbff] transition-colors"
                          onClick={() => toggleLeak(leak._id)}
                        >
                          <span
                            className="transition-transform duration-200 text-[#00aaff] shrink-0"
                            style={{
                              transform: isLeakOpen
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                            }}
                          >
                            ▶
                          </span>
                          <span className="text-[#ccc] font-medium wrap-break-word">
                            {leak.targetName}
                          </span>
                          <span className="text-xs text-[#666] bg-white/5 px-2 py-1 rounded shrink-0">
                            {leak.targetType}
                          </span>
                        </div>
                        {isLeakOpen && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                            {/* Submitter and Verifiers Info */}
                            {(leak.submitterName || leak.verifierNames) && (
                              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                {leak.submitterName && (
                                  <div className="text-xs text-green-400 mb-1">
                                    <span className="font-semibold">
                                      Submitted by:
                                    </span>{" "}
                                    {leak.submitterName}
                                  </div>
                                )}
                                {leak.verifierNames &&
                                  leak.verifierNames.length > 0 && (
                                    <div className="text-xs text-green-400">
                                      <span className="font-semibold">
                                        ✓ Verified by:
                                      </span>{" "}
                                      {leak.verifierNames.join(", ")}
                                    </div>
                                  )}
                              </div>
                            )}
                            <div>
                              <div className="text-[#00aaff] text-sm font-semibold mb-1 flex items-center justify-between">
                                <span>Prompt:</span>
                                <button
                                  onClick={() =>
                                    copyPrompt(leak.leakText, leak._id)
                                  }
                                  className="text-xs px-2 py-1 rounded bg-[#00aaff]/20 hover:bg-[#00aaff]/30 transition-colors flex items-center gap-1"
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
                              <div className="text-[#ccc] text-sm bg-black/30 p-3 rounded border border-white/5 wrap-break-word overflow-wrap-anywhere max-w-full max-h-64 overflow-y-auto overflow-x-auto">
                                <pre className="whitespace-pre-wrap wrap-break-word font-sans">
                                  {leak.leakText}
                                </pre>
                              </div>
                            </div>
                            {leak.leakContext && (
                              <div>
                                <div className="text-[#00aaff] text-sm font-semibold mb-1">
                                  Context:
                                </div>
                                <div className="text-[#ccc] text-sm wrap-break-word">
                                  {leak.leakContext}
                                </div>
                              </div>
                            )}
                            {leak.url && (
                              <div>
                                <div className="text-[#00aaff] text-sm font-semibold mb-1">
                                  URL:
                                </div>
                                <a
                                  href={leak.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#33bbff] text-sm hover:underline break-all"
                                >
                                  {leak.url}
                                </a>
                              </div>
                            )}
                            {leak.accessNotes && (
                              <div>
                                <div className="text-[#00aaff] text-sm font-semibold mb-1">
                                  Access Notes:
                                </div>
                                <div className="text-[#ccc] text-sm wrap-break-word">
                                  {leak.accessNotes}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              {leak.requiresLogin && (
                                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded shrink-0">
                                  🔐 Requires Login
                                </span>
                              )}
                              {leak.isPaid && (
                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded shrink-0">
                                  💰 Paid
                                </span>
                              )}
                              {leak.hasToolPrompts && (
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded shrink-0">
                                  🔧 Has Tool Prompts
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (verifiedLeaks === undefined || requestsWithStatus === undefined) {
    return (
      <div className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative">
        <h2 className="text-[#00aaff] text-2xl mb-6">📚 Leak Library</h2>
        <div className="flex justify-center h-screen">
          <p className="text-[#00aaff] text-center">Loading leaks...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </div>
    );
  }
  const openSectionsCount = openSections.size;

  return (
    <div
      className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative flex flex-col"
      style={{ height: "960px" }}
    >
      {showErrorToast && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <span className="text-lg">❌</span>
          <span className="font-medium">Failed to copy to clipboard</span>
        </div>
      )}
      <h2 className="text-[#00aaff] text-2xl mb-6 shrink-0">📚 Leak Library</h2>
      {!isUserLoggedIn && (
        <div className="bg-[#00aaff]/10 border border-[#00aaff]/30 rounded-lg p-4 mb-6 shrink-0">
          <p className="text-[#00aaff] text-center">
            🔒 Please sign in to submit leaks
          </p>
        </div>
      )}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 pr-2">
        {/* Verified Leaks Section */}
        <div
          className={`border border-green-500/30 rounded-lg bg-green-500/5 flex flex-col ${openSections.has("verified") && openSectionsCount > 0 ? "flex-1" : "shrink-0"} min-h-0`}
        >
          <div className="p-4 shrink-0">
            <h2
              className="text-green-400 text-xl font-bold flex items-center gap-2 cursor-pointer hover:text-green-300 transition-colors"
              onClick={() => toggleSection("verified")}
            >
              <span
                className="transition-transform duration-200"
                style={{
                  transform: openSections.has("verified")
                    ? "rotate(90deg)"
                    : "rotate(0deg)",
                }}
              >
                ▶
              </span>
              <span>{openSections.has("verified") ? "📂" : "📁"}</span>
              <span>Verified Leaks</span>
              <span className="text-sm text-[#666]">
                ({verifiedLeaks.length})
              </span>
            </h2>
          </div>
          {openSections.has("verified") && (
            <div className="px-4 pb-4 overflow-y-auto flex-1 min-h-0">
              {renderLeakSection(verifiedLeaks, "verified")}
            </div>
          )}
        </div>

        {/* Requests Awaiting Verification Section */}
        <div
          className={`border border-yellow-500/30 rounded-lg bg-yellow-500/5 flex flex-col ${openSections.has("requests") && openSectionsCount > 0 ? "flex-1" : "shrink-0"} min-h-0`}
        >
          <div className="p-4 shrink-0">
            <h2
              className="text-yellow-400 text-xl font-bold flex items-center gap-2 cursor-pointer hover:text-yellow-300 transition-colors"
              onClick={() => toggleSection("requests")}
            >
              <span
                className="transition-transform duration-200"
                style={{
                  transform: openSections.has("requests")
                    ? "rotate(90deg)"
                    : "rotate(0deg)",
                }}
              >
                ▶
              </span>
              <span>{openSections.has("requests") ? "📂" : "📁"}</span>
              <span>Requests Awaiting Verification</span>
              <span className="text-sm text-[#666]">
                ({requestsWithStatus.length})
              </span>
            </h2>
          </div>
          {openSections.has("requests") && (
            <div className="px-4 pb-4 overflow-y-auto flex-1 min-h-0">
              {renderRequestSection(requestsWithStatus)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
