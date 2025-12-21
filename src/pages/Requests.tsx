import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
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

export default function Requests() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const openRequests = useQuery(api.requests.getOpenRequests);
  const userRequests = useQuery(
    api.requests.getUserOpenRequests,
    user ? { userId: user._id } : "skip",
  );
  const createRequest = useMutation(api.requests.createRequest);
  const closeRequest = useMutation(api.requests.closeRequest);

  const [formData, setFormData] = useState({
    targetName: "",
    provider: "",
    targetType: "model" as
      | "model"
      | "app"
      | "tool"
      | "agent"
      | "plugin"
      | "custom",
    targetUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRequestsCount = userRequests?.length || 0;
  const hasReachedLimit = userRequestsCount >= 3;

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
    } catch (error: any) {
      // Fallback for unexpected errors
      console.error("Error closing request:", error);
      const errorMessage =
        error?.data ||
        error?.message ||
        "Failed to close request. Please try again.";
      setError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !formData.targetName ||
      !formData.provider ||
      !formData.targetUrl ||
      !isAuthenticated
    ) {
      return;
    }

    if (hasReachedLimit) {
      setError(
        "You have reached the maximum limit of 3 open requests. Please wait for some to be fulfilled before creating more.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createRequest(formData);

      // Check if the mutation returned an error
      if (!result.success) {
        setError(result.error);
        return;
      }

      // Success - reset form and clear any previous errors
      setError(null);
      setFormData({
        targetName: "",
        provider: "",
        targetType: "model",
        targetUrl: "",
      });
    } catch (error: any) {
      // Fallback for unexpected errors
      const errorMessage =
        error?.data ||
        error?.message ||
        "Failed to create request. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
        <h1 className="text-4xl font-bold bg-linear-to-r from-[#00ff88] via-[#00aaff] to-[#ff00ff] bg-clip-text text-transparent mb-2">
          🎯 System Prompt Requests
        </h1>
        <p className="text-[#888] text-lg">
          Request system prompts for AI models, apps, and tools. The community
          will help find them!
        </p>
      </div>

      {/* Create Request Form - Only visible when logged in */}
      {isAuthenticated && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#00aaff]">
              ➕ Make a Request
            </h2>
            <div className="text-sm">
              <span
                className={hasReachedLimit ? "text-red-400" : "text-[#00ff88]"}
              >
                {userRequestsCount}/3
              </span>
              <span className="text-[#888] ml-1">open requests</span>
            </div>
          </div>
          {hasReachedLimit && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm">
                ⚠️ You have reached the maximum limit of 3 open requests. Please
                wait for some to be fulfilled before creating more.
              </p>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#e0e0e0] mb-2 font-medium">
                  Target Name *
                </label>
                <input
                  type="text"
                  value={formData.targetName}
                  onChange={(e) =>
                    setFormData({ ...formData, targetName: e.target.value })
                  }
                  placeholder="e.g., GPT-4, Claude_12oct2025, Gemini2.5"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#00ff88]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#e0e0e0] mb-2 font-medium">
                  Provider *
                </label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData({ ...formData, provider: e.target.value })
                  }
                  placeholder="e.g., OpenAI, Anthropic, Google"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#00ff88]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#e0e0e0] mb-2 font-medium">
                  Type *
                </label>
                <select
                  value={formData.targetType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetType: e.target.value as
                        | "model"
                        | "app"
                        | "tool"
                        | "agent"
                        | "plugin"
                        | "custom",
                    })
                  }
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#00ff88]"
                >
                  <option value="model">Model</option>
                  <option value="app">App</option>
                  <option value="tool">Tool</option>
                  <option value="agent">Agent</option>
                  <option value="plugin">Plugin</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-[#e0e0e0] mb-2 font-medium">
                  Target URL *
                </label>
                <input
                  type="url"
                  value={formData.targetUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, targetUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#00ff88]"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || hasReachedLimit}
              className="bg-linear-to-r from-[#00ff88] to-[#00aaff] text-black font-bold px-6 py-3 rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Submitting..."
                : hasReachedLimit
                  ? "Limit Reached"
                  : "Submit Request"}
            </Button>
          </form>
        </div>
      )}

      {/* User's Open Requests - Only visible when logged in */}
      {isAuthenticated && user && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-[#00aaff] mb-4">
            📋 Your Open Requests
          </h2>
          {!userRequests ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00ff88]"></div>
            </div>
          ) : userRequests.length === 0 ? (
            <p className="text-[#888] text-center py-8">
              You haven't made any requests yet.
            </p>
          ) : (
            <div className="space-y-4">
              {userRequests.map((request) => (
                <div
                  key={request._id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#00aaff]/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-[#00ff88]">
                      {request.targetName}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#00aaff]/20 text-[#00aaff] px-3 py-1 rounded-full text-sm font-medium">
                        {request.targetType}
                      </span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                              onClick={() => handleCloseRequest(request._id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Close Request
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <p className="text-[#e0e0e0] mb-2">
                    Provider: {request.provider}
                  </p>
                  <a
                    href={request.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00aaff] hover:underline text-sm break-all"
                  >
                    {request.targetUrl}
                  </a>
                  <p className="text-[#666] text-sm mt-2">
                    Requested on{" "}
                    {new Date(request._creationTime).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Open Requests */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-[#00aaff] mb-4">
          🌍 All Open Requests
        </h2>
        {!openRequests ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00ff88]"></div>
          </div>
        ) : openRequests.length === 0 ? (
          <p className="text-[#888] text-center py-8">
            No open requests yet. Be the first to make one!
          </p>
        ) : (
          <div className="space-y-4">
            {openRequests.map((request: (typeof openRequests)[number]) => (
              <div
                key={request._id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#00ff88]/50 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-[#00ff88]">
                    {request.targetName}
                  </h3>
                  <span className="bg-[#00aaff]/20 text-[#00aaff] px-3 py-1 rounded-full text-sm font-medium">
                    {request.targetType}
                  </span>
                </div>
                <p className="text-[#e0e0e0] mb-2">
                  Provider: {request.provider}
                </p>
                <a
                  href={request.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00aaff] hover:underline text-sm break-all"
                >
                  {request.targetUrl}
                </a>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                  <p className="text-[#666] text-sm">
                    Requested by {request.submitterName}
                  </p>
                  <p className="text-[#666] text-sm">
                    {new Date(request._creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action for non-logged in users */}
      {!isAuthenticated && (
        <div className="bg-linear-to-r from-[#00ff88]/10 via-[#00aaff]/10 to-[#ff00ff]/10 border-2 border-[#00ff88]/30 rounded-2xl p-8 backdrop-blur-sm text-center">
          <h3 className="text-2xl font-bold text-[#00ff88] mb-2">
            Want to make a request?
          </h3>
          <p className="text-[#888] mb-4">
            Sign in with GitHub to request system prompts from the community
          </p>
        </div>
      )}
    </div>
  );
}
