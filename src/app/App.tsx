import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { useAuthStore } from "@/features/auth/authStore";

/** Racine de l'app — démarre l'écoute de session Supabase au boot. */
export function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return <RouterProvider router={router} />;
}
