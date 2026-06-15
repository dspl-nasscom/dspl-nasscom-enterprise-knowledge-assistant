// components/session-provider.tsx

"use client";

import { useEffect, useState } from "react";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const storedSession = localStorage.getItem("session");
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }, []);

  return <>{children}</>;
}