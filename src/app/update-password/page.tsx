import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/api/supabaseServer";

export const metadata = {
  title: "Update Password - Tickle AI",
};

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Expulsar imediatamente utilizadores que adivinharam o URL sem o link do email
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex flex-col items-center justify-center">
        <Image
          src="/logo.jpg"
          alt="Tickle AI Logo"
          width={80}
          height={80}
          className="rounded-xl shadow-lg object-contain"
          priority
        />
        <h1 className="mt-4 text-3xl font-bold tracking-tight font-sans">Tickle AI</h1>
      </div>
      
      <UpdatePasswordForm />
    </div>
  );
}
