import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";

/** Racine de l'app — les providers (auth, etc.) s'ajouteront ici. */
export function App() {
  return <RouterProvider router={router} />;
}
