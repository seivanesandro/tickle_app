import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/api/supabaseServer";
import Groq from "groq-sdk";
import { env } from "@/shared/config/env";

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const SYSTEM_PROMPTS = {
  intelectual: "És um assistente muito inteligente, perspicaz e ligeiramente sarcástico. Responde de forma culta, mas direta e sem grandes formatações.",
  profissional: "És um assistente corporativo, estritamente formal, sério e analítico. Evita opiniões pessoais e foca-te em dados e objetividade.",
  atrevido: "És uma IA livre, sedutora e descontraída para debates abertos, capaz de conversar com alguma pimenta, sempre de forma carismática mas ajudando com a tarefa real.",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Validar utilizador autenticado e ler cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Verificar se o utilizador tem a conta bloqueada (is_locked)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_locked")
      .eq("id", user.id)
      .single();

    if (userError || userData?.is_locked) {
      return NextResponse.json({ error: "Conta bloqueada. Limite de mensagens atingido." }, { status: 403 });
    }

    // 3. Ler o body
    const body = await req.json();
    const { chatId, mode, content, imageBase64 } = body;

    if (!chatId || !mode) {
      return NextResponse.json({ error: "Faltam parâmetros obrigatórios (chatId, mode)." }, { status: 400 });
    }

    let storagePath = null;

    // 4. Validar e gravar imagem
    if (imageBase64) {
      // Validar 20MB (tamanho em base64 -> bytes = length * 0.75)
      const sizeInBytes = Math.ceil((imageBase64.length * 3) / 4);
      if (sizeInBytes > 20 * 1024 * 1024) {
        return NextResponse.json({ error: "A imagem excede o limite de 20MB da API." }, { status: 413 });
      }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      const fileName = `${crypto.randomUUID()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat_images")
        .upload(filePath, buffer, {
          contentType: "image/jpeg",
        });

      if (uploadError) {
        return NextResponse.json({ error: "Falha ao gravar a imagem no storage privativo." }, { status: 500 });
      }
      
      storagePath = filePath;
    }

    // 5. Inserir a mensagem do utilizador
    const { data: messageData, error: msgError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "user",
        content: content || null,
      })
      .select("id")
      .single();

    if (msgError) {
      return NextResponse.json({ error: "Erro ao gravar a mensagem." }, { status: 500 });
    }

    // Inserir referência da imagem na tabela message_images, se aplicável
    if (storagePath) {
      await supabase
        .from("message_images")
        .insert({
          message_id: messageData.id,
          storage_path: storagePath,
        });
    }

    // 6. Preparar Injeção do System Prompt
    const sysPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.intelectual;
    let aiResponseText = "";

    // 7 & 10. Chamar a IA (Groq) com Try/Catch e timeout
    try {
      if (imageBase64) {
        // Modelo Visão (Qwen) via API formatada para multimodais no Groq
        // (Cast para any para forçar endpoint alternativo conforme documentação interna)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (groq as any).responses.create({
          model: "qwen/qwen3.6-27b",
          messages: [
            { role: "system", content: sysPrompt },
            {
              role: "user",
              content: [
                ...(content ? [{ type: "text", text: content }] : []),
                { type: "input_image", image_url: { url: imageBase64 } },
              ],
            },
          ],
        }, { timeout: 15000 });

        aiResponseText = response.choices?.[0]?.message?.content || "";
      } else {
        // Modelo Texto Rápido
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: content },
          ],
        }, { timeout: 15000 });

        aiResponseText = response.choices[0]?.message?.content || "";
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (apiErr: any) {
      const status = apiErr?.status || 500;
      return NextResponse.json(
        { error: apiErr?.message || "Erro na comunicação com a API da Groq." },
        { status }
      );
    }

    // 8. Gravar Resposta do Assistente
    await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "assistant",
        content: aiResponseText,
      });

    // 9. Devolver
    return NextResponse.json({ success: true, content: aiResponseText });

  } catch {
    return NextResponse.json({ error: "Erro interno de servidor." }, { status: 500 });
  }
}

