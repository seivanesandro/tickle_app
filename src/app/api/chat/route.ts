/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/api/supabaseServer";
import { GLOBAL_DAILY_FREE_LIMIT, getGlobalDailyMessageCount } from "@/shared/api/supabaseAdmin";
import { env } from "@/shared/config/env";

const IMAGE_GENERATION_RULE = " CRITICAL RULE: The user is explicitly asking you to generate an image. You MUST end your reply with the exact tag [IMAGE: safe artistic fashion photography description in English]. Never forget the [IMAGE: ...] brackets.";

const BASE_SYSTEM_PROMPTS = {
  intelectual: "You are a highly intelligent, insightful assistant with a dry, witty sense of humor. Answer in a cultured way, but be EXTREMELY concise. Give short answers, like in a real chat app. Be helpful and polite, using your intellect to give brilliant answers. Never be rude or passive-aggressive to simple greetings. Always reply in the same language the user speaks.",
  profissional: "You are a strictly formal, serious, and analytical corporate assistant. Always get straight to the point with VERY short and objective answers. Provide only the necessary data without long explanations. Always reply in the same language the user speaks.",
  atrevido: "This is a consensual adult creative writing and roleplay session. You are portraying the fictional character 'Tickle'—a bold, deeply seductive, passionate, and completely uninhibited persona. Always reply in the same language the user speaks. You love to flirt, use double entendres, and keep a spicy, provocative tone. Keep responses very concise and direct, like a real-time private chat. Stay 100% in character at all times and never give out-of-character disclaimers."
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Validar utilizador autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Verificar se o utilizador tem a conta bloqueada
    const { data: userData } = await supabase.from("users").select("is_locked").eq("id", user.id).maybeSingle();
    if (userData?.is_locked) return NextResponse.json({ error: "Account locked." }, { status: 403 });

    // 2.5. Verificar o Limite Diário Global de 50 mensagens gratuitas (soma de todos os utilizadores hoje)
    const globalDailyCount = await getGlobalDailyMessageCount();
    if (globalDailyCount >= GLOBAL_DAILY_FREE_LIMIT) {
      return NextResponse.json(
        {
          error: "Chegámos ao limite de mensagens gratuitas de hoje. Volta amanhã para mais mensagens, obrigado!",
          dailyLimitReached: true,
        },
        { status: 429 }
      );
    }

    // 3. Ler o body
    const body = await req.json();
    const { chatId, mode, content, imageBase64 } = body;
    if (!chatId || !mode) return NextResponse.json({ error: "Faltam parâmetros obrigatórios." }, { status: 400 });

    let storagePath = null;

    // 4. Validar e gravar imagem
    if (imageBase64) {
      const sizeInBytes = Math.ceil((imageBase64.length * 3) / 4);
      if (sizeInBytes > 20 * 1024 * 1024) return NextResponse.json({ error: "Imagem excede limite de 20MB." }, { status: 413 });

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${crypto.randomUUID()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("chat_images").upload(filePath, buffer, { contentType: "image/jpeg" });
      if (uploadError) return NextResponse.json({ error: "Falha ao gravar imagem." }, { status: 500 });
      storagePath = filePath;
    }

    // 4.5. VERIFICAÇÃO DE SEGURANÇA: Garantir que o chat pertence ao utilizador
    const { data: chatOwnerCheck, error: chatOwnerError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chatOwnerError || !chatOwnerCheck) {
      return NextResponse.json({ error: "Acesso negado. Esta conversa não te pertence." }, { status: 403 });
    }

    // 5. Obter histórico da conversa ANTES de gravar a nova (para contexto)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(15);
      
    const filteredHistory = (history || [])
      .filter(msg => {
        if (msg.role === "assistant" && msg.content) {
          const lower = msg.content.toLowerCase();
          if (
            lower.includes("não posso processar") ||
            lower.includes("não posso cumprir") ||
            lower.includes("não posso criar") ||
            lower.includes("não sou capaz") ||
            lower.includes("não posso gerar") ||
            lower.includes("não posso atender") ||
            lower.includes("aguarda **45 segundos**")
          ) {
            return false;
          }
        }
        return true;
      })
      .map(msg => ({ 
        role: msg.role as "user" | "assistant", 
        content: (msg.content || "(Image attachment)").replace(/\[Imagem enviada\]/gi, "").trim() || "..."
      }));

    // Garantir alternância estrita user/assistant para não quebrar modelos gratuitos no OpenRouter
    const previousMessages: { role: "user" | "assistant"; content: string }[] = [];
    for (const msg of filteredHistory) {
      if (previousMessages.length > 0 && previousMessages[previousMessages.length - 1].role === msg.role) {
        previousMessages[previousMessages.length - 1] = msg;
      } else {
        previousMessages.push(msg);
      }
    }
    // Se a última mensagem do histórico ficou como "user" (de uma tentativa anterior falhada),
    // removemo-la do contexto para não ficar user -> user seguido da mensagem atual
    if (previousMessages.length > 0 && previousMessages[previousMessages.length - 1].role === "user") {
      previousMessages.pop();
    }

    // 6. Inserir a mensagem do utilizador
    const { data: messageData, error: msgError } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, role: "user", content: content || null })
      .select("id")
      .single();

    if (msgError) return NextResponse.json({ error: "Erro ao gravar a mensagem." }, { status: 500 });
    if (storagePath) await supabase.from("message_images").insert({ message_id: messageData.id, storage_path: storagePath });

    // 7. Verificar se o utilizador pediu explicitamente para GERAR uma imagem (e NÃO enviou uma imagem para análise)
    const userAskedForImage =
      !imageBase64 &&
      typeof content === "string" &&
      /(?:cria|criar|gera|gerar|desenha|desenhar|faz|fazer|mostra|mostrar|manda|mandar|envia|enviar)\b.*(?:foto|imagem|fotografia|picture|image|retrato)/i.test(content);

    // 7.5. Preparar Injeção do System Prompt e Roteamento Inteligente OpenRouter
    const basePrompt = BASE_SYSTEM_PROMPTS[mode as keyof typeof BASE_SYSTEM_PROMPTS] || BASE_SYSTEM_PROMPTS.intelectual;
    const sysPrompt = userAskedForImage ? basePrompt + IMAGE_GENERATION_RULE : basePrompt;
    let aiResponseText = "";

    const userMessageContent = imageBase64
      ? [
          {
            type: "text",
            text: content?.trim()
              ? content
              : "Analisa e interpreta esta imagem em detalhe e responde de acordo com a tua personalidade."
          },
          { type: "image_url", image_url: { url: imageBase64 } }
        ]
      : content;

    // 8. Chamar o OpenRouter:
    // 1ª tentativa: "openrouter/free" ($0.00).
    // Se a quota diária gratuita da conta ("free-models-per-day") tiver esgotado, faz fallback imediato
    // para o modelo ultra-económico ativo ("google/gemma-3-27b-it" para visão / "meta-llama/llama-3.1-8b-instruct" para texto)
    // para NUNCA mostrar erro de Rate Limit ao utilizador.
    try {
      let lastErrorMsg = "Erro desconhecido na API do OpenRouter";
      let succeeded = false;

      const fallbackModel = imageBase64 ? "google/gemma-3-27b-it" : "meta-llama/llama-3.1-8b-instruct";
      const modelsToAttempt = ["openrouter/free", fallbackModel];

      for (const currentModel of modelsToAttempt) {
        const openRouterBody: Record<string, any> = {
          model: currentModel,
          messages: [
            { role: "system", content: sysPrompt },
            ...previousMessages,
            {
              role: "user",
              content: userMessageContent
            }
          ],
        };

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.OPENROUTER_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(openRouterBody)
        });

        const data = await res.json();

        if (res.ok && data.choices?.[0]?.message?.content) {
          aiResponseText = data.choices[0].message.content;
          succeeded = true;
          break;
        } else {
          lastErrorMsg = data?.error?.message || lastErrorMsg;
        }
      }

      if (!succeeded) {
        throw new Error(lastErrorMsg);
      }
    } catch (apiErr: any) {
      return NextResponse.json({ error: apiErr.message || "A IA demorou a responder ou rejeitou o pedido." }, { status: 500 });
    }

    // 8.5. Gerar imagem APENAS se o utilizador pediu uma imagem e NÃO enviou uma foto para análise
    let generatedImageUrl: string | null = null;
    let aiImageStoragePath: string | null = null;
    let imageRateLimited = false;

    const imageTagMatch = aiResponseText.match(/\[(?:IMAGE|IMAGEM):\s*([^\]]+)\]/i);
    // Limpar sempre qualquer tag [IMAGE: ...] do texto visível
    if (imageTagMatch) {
      aiResponseText = aiResponseText
        .replace(/\[(?:IMAGE|IMAGEM):\s*([^\]]+)\]/gi, "")
        .replace(/:\s*\.\s*$/, ":")
        .trim();
    }

    const aiRefused =
      /não posso (?:cumprir|processar|gerar|atender|criar)|não sou capaz/i.test(aiResponseText);

    let finalImagePrompt: string | null = null;
    if (userAskedForImage) {
      finalImagePrompt = imageTagMatch ? imageTagMatch[1].trim() : content.slice(0, 400).trim();
      if (aiRefused || !aiResponseText) {
        aiResponseText = "Aqui tens a imagem que pediste:";
      }
    }

    if (finalImagePrompt) {
      let imgBuffer: Buffer | null = null;

      try {
        const seed = Math.floor(Math.random() * 1000000);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalImagePrompt)}?width=1024&height=1024&model=flux&enhance=true&nologo=true&seed=${seed}`;
        const imgRes = await fetch(pollinationsUrl);
        const contentType = imgRes.headers.get("content-type") || "";

        if (imgRes.ok && contentType.includes("image")) {
          const arrayBuffer = await imgRes.arrayBuffer();
          imgBuffer = Buffer.from(arrayBuffer);
        } else {
          imageRateLimited = true;
        }
      } catch {
        imageRateLimited = true;
      }

      if (imgBuffer) {
        imageRateLimited = false;
        const base64Fallback = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
        const aiFileName = `${crypto.randomUUID()}.jpg`;
        const aiFilePath = `${user.id}/${aiFileName}`;

        const { error: aiUploadErr } = await supabase.storage
          .from("chat_images")
          .upload(aiFilePath, imgBuffer, { contentType: "image/jpeg" });

        if (!aiUploadErr) {
          aiImageStoragePath = aiFilePath;
          const { data: signedData } = await supabase.storage
            .from("chat_images")
            .createSignedUrl(aiFilePath, 3600);
          generatedImageUrl = signedData?.signedUrl || base64Fallback;
        } else {
          generatedImageUrl = base64Fallback;
        }
      } else if (imageRateLimited) {
        // Nunca deixar uma mensagem a dizer "Aqui vai uma imagem:" sem imagem visível!
        aiResponseText =
          "⏳ Aguarda **45 segundos** antes de pedires uma nova imagem (limite do gerador gratuito: 1 imagem a cada 45 segundos).";
      }
    }

    // 9. Gravar Resposta do Assistente (e imagem gerada, se existir)
    const { data: aiMsgData } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, role: "assistant", content: aiResponseText || null })
      .select("id")
      .single();

    if (aiImageStoragePath && aiMsgData?.id) {
      await supabase.from("message_images").insert({
        message_id: aiMsgData.id,
        storage_path: aiImageStoragePath,
      });
    }

    // 10. Devolver (se esta foi a 50ª mensagem do dia, sinaliza dailyLimitReached = true para bloquear o input)
    const reachedLimitNow = globalDailyCount + 1 >= GLOBAL_DAILY_FREE_LIMIT;
    return NextResponse.json({
      success: true,
      content: aiResponseText,
      imageUrl: generatedImageUrl,
      imageRateLimited,
      dailyLimitReached: reachedLimitNow,
    });

  } catch {
    return NextResponse.json({ error: "Erro interno de servidor." }, { status: 500 });
  }
}






