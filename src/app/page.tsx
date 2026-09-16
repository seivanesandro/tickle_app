import { redirect } from "next/navigation";

export default function Home() {
  // Redireciona imediatamente a raiz do site (/) para a página de chat (/chat)
  // A própria página do /chat vai verificar se o utilizador está autenticado,
  // e se não estiver, redireciona-o para /login (via useEffect no ChatPage).
  redirect("/chat");
}
