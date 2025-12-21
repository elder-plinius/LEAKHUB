import { Github, LogOut, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Navbar() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();

  function SignOutButton() {
    return (
      <>
        <LogOut className="w-4 h-4 text-[#00ff88]" />
        <span>Sign out</span>
      </>
    );
  }

  function SignInButton() {
    const { signIn } = useAuthActions();
    return (
      <button
        className="bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border border-[#00ff88]/30 text-[#e0e0e0] hover:text-white px-6 py-2 rounded-lg font-medium transition-all hover:-translate-y-0.5"
        onClick={() => signIn("github")}
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar className="w-9 h-9 ring-2 ring-[#00ff88]/30 hover:ring-[#00ff88]/50 transition-all">
              <AvatarImage src={user?.image} alt={user?.name ?? "User"} />
              <AvatarFallback className="bg-[#00ff88] text-black font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1a] border-0 text-[#e0e0e0]">
            <DropdownMenuLabel className="text-[#888]">
              {user?.name ?? "My Account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#00ff88]/20" />
            <DropdownMenuItem
              asChild
              className="cursor-pointer hover:bg-[#00ff88]/10 hover:text-white focus:bg-[#00ff88]/10 focus:text-white"
            >
              <a
                href="/dashboard"
                className="flex items-center gap-2 text-white"
              >
                <LayoutDashboard className="w-4 h-4 text-[#00ff88]" />
                <span>Dashboard</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void signOut()}
              className="cursor-pointer hover:bg-[#00ff88]/10 hover:text-white focus:bg-[#00ff88]/10 focus:text-white flex items-center gap-2"
            >
              <SignOutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <SignInButton />
      )}
      <a
        href="https://github.com/elder-plinius/CL4R1T4S"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border border-[#00ff88]/30 text-[#e0e0e0] hover:text-white p-2 rounded-lg transition-all hover:-translate-y-0.5 flex items-center justify-center"
      >
        <Github className="w-5 h-5" />
      </a>
    </div>
  );
}
