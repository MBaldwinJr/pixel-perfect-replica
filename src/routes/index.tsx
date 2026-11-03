import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Peixoto Tax Intelligence" },
      { name: "description", content: "Inteligência tributária, fiscal e financeira da Peixoto Materiais de Construção." },
      { property: "og:title", content: "Peixoto Tax Intelligence" },
      { property: "og:description", content: "Inteligência tributária, fiscal e financeira da Peixoto Materiais de Construção." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
