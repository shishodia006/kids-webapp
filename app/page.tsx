"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");

    if (role === "admin") router.push("/admin");
    else if (role === "brand") router.push("/brand");
    else if (role === "affiliate") router.push("/affiliate");
    else if (role === "user" || role === "app") router.push("/app");
  }, [router]);

  return (
    <iframe
      src="/landing.html"
      title="Konnectly landing page"
      className="h-screen w-full flex-1 border-0"
    />
  );
}
