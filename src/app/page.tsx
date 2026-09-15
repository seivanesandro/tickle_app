import { redirect } from "next/navigation";

export default function Home() {
  // Redireciona imediatamente a raiz do site (/) para a página de chat (/chat)
  // Se o utilizador não estiver logado, o proxy.ts ou a página de chat tratará de o enviar para o /login
  redirect("/chat");
}
