"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import Loading from "../loading";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return; // still checking auth, do nothing

    if (!currentUser) {
      router.replace("/authentication/login");
      return;
    }

    if (role === "User") {
      const isChatPage = pathname === "/chat" || pathname.startsWith("/chat/");
      const isMyTicketsPage = pathname === "/my-tickets" || pathname.startsWith("/my-tickets/");
      const isAuthPage = pathname.startsWith("/authentication/");

      if (!isChatPage && !isMyTicketsPage && !isAuthPage) {
        router.replace("/chat");
        return;
      }
    }

    // Passed all checks
    setAllowed(true);

  }, [currentUser, loading, role, pathname, router]);

  // While loading or checking access
  if (loading || !allowed) {
    return <Loading />;
  }

  return <>{children}</>;
}
