import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Id } from "../../convex/_generated/dataModel";

type TargetType = "model" | "app" | "tool" | "agent" | "plugin" | "custom";

export function SubmitLeakForm() {
  const user = useQuery(api.users.currentUser);
  const insertLeak = useMutation(api.leaks.insertLeak);
  const createRequest = useMutation(api.requests.createRequest);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<{
    _id: Id<"requests">;
    targetName: string;
    provider: string;
    targetType: TargetType;
    targetUrl: string;
    submitterName: string;
  } | null>(null);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);

  const [targetType, setTargetType] = useState<TargetType | "">("");
  const [targetName, setTargetName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [provider, setProvider] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [hasToolPrompts, setHasToolPrompts] = useState(false);
  const [accessNotes, setAccessNotes] = useState("");
  const [leakText, setLeakText] = useState("");
  const [leakContext, setLeakContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search for existing requests
  const searchResults = useQuery(
    api.requests.searchRequests,
    searchQuery.trim() ? { searchQuery } : "skip",
  );

  // Auto-populate form when a request is selected
  useEffect(() => {
    if (selectedRequest) {
      setTargetName(selectedRequest.targetName);
      setProvider(selectedRequest.provider);
      setTargetType(selectedRequest.targetType);
      setTargetUrl(selectedRequest.targetUrl);
    }
  }, [selectedRequest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate required fields
    if (!leakText.trim()) {
      setError("Leak text is required");
      return;
    }

    if (showNewRequestForm) {
      // Validate new request fields
      if (
        !targetName.trim() ||
        !provider.trim() ||
        !targetUrl.trim() ||
        !targetType
      ) {
        setError(
          "Target name, provider, URL, and type are required for new submissions",
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let requestId: Id<"requests"> | undefined = undefined;

      // If submitting for a new request (not linked to existing), create a new request
      if (showNewRequestForm && !selectedRequest) {
        const requestResult = await createRequest({
          targetName,
          provider,
          targetType: targetType as TargetType,
          targetUrl,
        });

        if (!requestResult.success) {
          setError(requestResult.error);
          setIsSubmitting(false);
          return;
        }

        requestId = requestResult.requestId;
      } else if (selectedRequest) {
        requestId = selectedRequest._id;
      }

      // Submit the leak
      const result = await insertLeak({
        targetName: selectedRequest?.targetName || targetName,
        provider: selectedRequest?.provider || provider,
        leakText,
        targetType: selectedRequest?.targetType || (targetType as TargetType),
        requestId,
        requiresLogin,
        isPaid,
        hasToolPrompts,
        accessNotes: accessNotes || undefined,
        leakContext: leakContext || undefined,
        url: selectedRequest?.targetUrl || targetUrl || undefined,
      });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success - reset form
      setError(null);
      setLeakText("");
      setLeakContext("");
      setAccessNotes("");
      setRequiresLogin(false);
      setIsPaid(false);
      setHasToolPrompts(false);
      setSelectedRequest(null);
      setShowNewRequestForm(false);
      setTargetName("");
      setProvider("");
      setTargetUrl("");
      setTargetType("");

      // Show success message
      setSuccessMessage(
        result.message ||
          "Leak submitted successfully! It will be reviewed for verification.",
      );

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      // Fallback for unexpected errors
      const errorMessage =
        error?.data ||
        error?.message ||
        "Failed to submit leak. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectRequest = (request: {
    _id: Id<"requests">;
    targetName: string;
    provider: string;
    targetType: TargetType;
    targetUrl: string;
    submitterName: string;
  }) => {
    setSelectedRequest(request);
    setSearchQuery("");
    setShowNewRequestForm(false);
  };

  const handleCreateNew = () => {
    setSelectedRequest(null);
    setShowNewRequestForm(true);
    setSearchQuery("");
  };

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      <h2 className="text-[#00aaff] text-2xl mb-6 flex items-center gap-2">
        📤 Submit Leak
      </h2>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
          <p className="text-green-400 text-sm">✓ {successMessage}</p>
        </div>
      )}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* Search for existing requests */}
        {!selectedRequest && !showNewRequestForm && (
          <div className="bg-black/30 border border-white/10 rounded-lg p-4">
            <p className="text-[#00aaff] text-sm mb-3">
              🔍 Search for Existing Requests
            </p>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by target name (e.g., ChatGPT-4, Claude)..."
              className="w-full bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-4 transition-all focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_20px_rgba(0,255,136,0.2)]"
            />

            {/* Search results */}
            {searchResults && searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((request) => (
                  <div
                    key={request._id}
                    onClick={() => handleSelectRequest(request)}
                    className="bg-black/50 border border-white/10 rounded-lg p-4 cursor-pointer transition-all hover:border-[#00ff88] hover:shadow-[0_0_10px_rgba(0,255,136,0.2)]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-[#00ff88] font-semibold">
                          {request.targetName}
                        </h3>
                        <p className="text-[#888] text-sm">
                          {request.provider}
                        </p>
                        <p className="text-[#666] text-xs mt-1">
                          Requested by: {request.submitterName}
                        </p>
                      </div>
                      <span className="text-[#00aaff] text-xs">
                        {request.targetType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults && searchResults.length === 0 && (
              <p className="text-[#888] text-sm mt-3">
                No existing requests found. Create a new one below.
              </p>
            )}

            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full mt-4 bg-black/50 border border-white/20 text-[#00aaff] p-3 rounded-lg transition-all hover:border-[#00aaff] hover:bg-black/70"
            >
              + Create New Submission (No Existing Request)
            </button>
          </div>
        )}

        {/* Display selected request */}
        {selectedRequest && (
          <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#00ff88] text-sm mb-1">
                  ✓ Submitting for existing request:
                </p>
                <h3 className="text-white font-semibold">
                  {selectedRequest.targetName}
                </h3>
                <p className="text-[#888] text-sm">
                  {selectedRequest.provider}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-[#888] hover:text-white text-sm"
              >
                ✕ Change
              </button>
            </div>
          </div>
        )}

        {/* Display new submission mode */}
        {showNewRequestForm && !selectedRequest && (
          <div className="bg-[#00aaff]/10 border border-[#00aaff]/30 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#00aaff] text-sm mb-1">
                  Creating new submission (no existing request)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRequestForm(false)}
                className="text-[#888] hover:text-white text-sm"
              >
                ← Back to Search
              </button>
            </div>
          </div>
        )}

        {/* Show form only after selection or new request choice */}
        {(selectedRequest || showNewRequestForm) && (
          <>
            {/* Display logged-in user */}
            <div className="bg-black/30 border border-white/10 rounded-lg p-4">
              <p className="text-[#888] text-sm mb-2">Submitting as:</p>
              <div className="flex items-center gap-3">
                {user?.image && (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-2 ring-[#00ff88]/30"
                  />
                )}
                <p className="text-[#00ff88] font-semibold">
                  {user?.name || "Loading..."}
                </p>
              </div>
            </div>

            {/* Show target details for new submissions */}
            {showNewRequestForm && (
              <>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as TargetType)}
                  className="bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-4"
                >
                  <option value="">Select target type...</option>
                  <option value="model">🤖 AI Model</option>
                  <option value="app">📱 App/Interface</option>
                  <option value="tool">🔧 Tool/Function</option>
                  <option value="agent">🤝 AI Agent</option>
                  <option value="plugin">🔌 Plugin/Extension</option>
                  <option value="custom">⚙️ Custom GPT/Bot</option>
                </select>

                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="Target name (e.g., ChatGPT-4, GitHub Copilot)"
                  className="bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-4 transition-all focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                />

                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="Provider (e.g., OpenAI, Anthropic, Google)"
                  className="bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-4 transition-all focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                />

                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="Target URL (e.g., https://chat.openai.com)"
                  className="bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-4 transition-all focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                />
              </>
            )}

            <div className="bg-black/30 border border-white/10 rounded-lg p-4">
              <p className="text-[#00aaff] text-sm mb-3">
                🔐 Access Requirements
              </p>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-[#888] text-sm cursor-pointer">
                  <Checkbox
                    checked={requiresLogin}
                    onCheckedChange={(checked) =>
                      setRequiresLogin(checked === true)
                    }
                  />
                  Requires Login
                </label>
                <label className="flex items-center gap-2 text-[#888] text-sm cursor-pointer">
                  <Checkbox
                    checked={isPaid}
                    onCheckedChange={(checked) => setIsPaid(checked === true)}
                  />
                  Paid/Subscription
                </label>
              </div>
              <input
                type="text"
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                placeholder="Additional access notes (e.g., 'Plus subscription required')"
                className="w-full mt-3 bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-2"
              />
            </div>

            <textarea
              value={leakText}
              onChange={(e) => setLeakText(e.target.value)}
              placeholder="Paste the suspected system prompt leak here..."
              required
              className="bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-4 min-h-[200px] font-mono text-sm resize-vertical transition-all focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_20px_rgba(0,255,136,0.2)]"
            />

            <input
              type="text"
              value={leakContext}
              onChange={(e) => setLeakContext(e.target.value)}
              placeholder="Context: How was this obtained? (optional)"
              className="bg-black/50 border border-white/10 rounded-lg text-[#e0e0e0] p-4 transition-all focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_20px_rgba(0,255,136,0.2)]"
            />

            <label className="flex gap-2 items-center cursor-pointer">
              <Checkbox
                checked={hasToolPrompts}
                onCheckedChange={(checked) =>
                  setHasToolPrompts(checked === true)
                }
              />
              <span className="text-[#888] text-sm">
                This target has tools/functions with their own prompts
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-linear-to-r from-[#00ff88] to-[#00aaff] text-black p-4 rounded-lg font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Leak to Library"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
