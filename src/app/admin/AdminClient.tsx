"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Trash2,
  MessageSquare,
  CalendarClock,
  Users,
  Loader2,
} from "lucide-react";
import { IUser } from "@/entities/user/model/types";
import { deleteUserByAdmin } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminClientProps {
  currentAdminId: string;
  initialUsers: IUser[];
  dailyLimit: number;
}

export function AdminClient({
  currentAdminId,
  initialUsers,
  dailyLimit,
}: AdminClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<IUser[]>(initialUsers);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(
    null
  );

  const todayUtc = new Date().toISOString().slice(0, 10);

  // Recalcular dinamicamente os totais a partir da lista atual de utilizadores
  const globalDailyCount = users.reduce((sum, u) => {
    if (u.last_message_date === todayUtc) {
      return sum + (u.daily_message_count || 0);
    }
    return sum;
  }, 0);

  const totalAllTimeMessages = users.reduce(
    (sum, u) => sum + (u.message_count || 0),
    0
  );

  const isDailyBlocked = globalDailyCount >= dailyLimit;
  const dailyProgressPercent = Math.min(
    100,
    Math.round((globalDailyCount / dailyLimit) * 100)
  );

  async function handleDeleteUser(targetUser: IUser) {
    if (targetUser.id === currentAdminId) {
      toast.error("Operação bloqueada", {
        description: "Não podes apagar a tua própria conta de administrador.",
      });
      return;
    }

    setDeletingUserId(targetUser.id);
    try {
      const res = await deleteUserByAdmin(targetUser.id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        setConfirmDeleteUserId(null);
        toast.success("Utilizador apagado com sucesso!", {
          description: `A conta ${targetUser.email} foi removida da base de dados.`,
        });
        router.refresh();
      } else {
        toast.error("Erro ao apagar utilizador", {
          description: res.error,
        });
      }
    } catch {
      toast.error("Erro de ligação ao servidor.");
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col font-sans">
      {/* HEADER */}
      <header className="border-b bg-card px-4 py-4 md:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(57,255,20,0.2)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              Painel de Administração
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestão de utilizadores e controlo global de mensagens do Tickle AI
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/chat">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Chat
          </Link>
        </Button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* TOP CARDS: CONTADORES GLOBAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Limite Diário Global (X / 50) */}
          <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Limite Gratuito de Hoje (UTC)
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {globalDailyCount}
                  </span>
                  <span className="text-lg text-muted-foreground font-medium">
                    / {dailyLimit} mensagens
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isDailyBlocked ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${dailyProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    isDailyBlocked
                      ? "text-destructive font-semibold"
                      : "text-primary font-semibold"
                  }
                >
                  {isDailyBlocked
                    ? "🔒 Chat bloqueado hoje (50/50 atingido)"
                    : "🟢 Chat aberto para envio de mensagens"}
                </span>
                <span className="text-muted-foreground">
                  Renova às 00:00 UTC
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Geral de Mensagens + Imagens */}
          <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Geral Enviado pelos Utilizadores
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-primary">
                    {totalAllTimeMessages}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    mensagens + imagens
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Soma acumulada de todas as mensagens de texto e imagens enviadas
              pelos utilizadores registados.
            </p>
          </div>
        </div>

        {/* TABELA DE UTILIZADORES REGISTADOS */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold">
                Utilizadores Registados ({users.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">
                    Email Registado
                  </th>
                  <th className="px-6 py-3.5 font-semibold text-center">
                    Mensagens Hoje
                  </th>
                  <th className="px-6 py-3.5 font-semibold text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isSelfAdmin =
                    u.id === currentAdminId || u.role === "admin";
                  const isConfirming = confirmDeleteUserId === u.id;
                  const isDeleting = deletingUserId === u.id;
                  const messagesToday =
                    u.last_message_date === todayUtc
                      ? u.daily_message_count || 0
                      : 0;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <span className="truncate">{u.email}</span>
                          {u.role === "admin" && (
                            <span className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary border border-primary/30">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[2rem] rounded-md px-2.5 py-0.5 text-xs font-bold ${
                            messagesToday > 0
                              ? "bg-primary/15 text-primary border border-primary/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {messagesToday}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isSelfAdmin ? (
                          <span className="text-xs text-muted-foreground italic">
                            Conta Admin Protegida
                          </span>
                        ) : isConfirming ? (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isDeleting}
                              onClick={() => handleDeleteUser(u)}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Confirmar"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isDeleting}
                              onClick={() => setConfirmDeleteUserId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDeleteUserId(u.id)}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Apagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-muted-foreground"
                    >
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
