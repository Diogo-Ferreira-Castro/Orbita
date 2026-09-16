const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const tasks: Record<string, string> = {
  summary: "Faça um resumo objetivo, bem organizado e fiel ao material.",
  explain: "Explique o conteúdo de maneira didática, destacando os pontos difíceis e dando exemplos.",
  check: "Confira fórmulas, contas e resultados. Mostre possíveis erros e apresente a correção passo a passo.",
  flashcards: "Crie flashcards de pergunta e resposta para revisar este conteúdo.",
  quiz: "Crie 10 questões de revisão variadas e coloque o gabarito somente no final.",
  organize: "Organize as anotações em títulos, subtítulos, tópicos e próximos passos sem inventar informações.",
  codeExplain: "Explique o código linha por linha, diga o que ele faz e ensine os conceitos usados.",
  codeReview: "Faça uma revisão técnica do código. Aponte bugs, riscos, legibilidade, desempenho e melhorias.",
  codeFix: "Corrija o código e devolva primeiro o código completo corrigido, pronto para copiar, seguido de uma explicação curta.",
};

function pageText(page: Record<string, unknown>) {
  return [
    `Título: ${String(page.title || "Sem título")}`,
    `Anotações:\n${String(page.text || "(sem anotações)")}`,
    `Documento Word:\n${String(page.wordHtml || "(sem documento)").replace(/<[^>]+>/g, " ")}`,
    `Fórmulas:\n${String(page.formulaText || "(nenhuma)")}`,
    `Planilha:\n${JSON.stringify(page.sheetData || [])}`,
    `Linguagem de programação: ${String(page.codeLanguage || "não informada")}`,
    `Código:\n${String(page.codeText || "(nenhum código)")}`,
  ].join("\n\n").slice(0, 60000);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return Response.json({ error: "Método não permitido" }, { status: 405, headers: cors });

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY não configurada no servidor");
    const body = await request.json();
    const taskName = String(body.task || "summary");
    const task = tasks[taskName] || tasks.summary;
    const input = taskName === "autoRegister"
      ? `Você é a IA de cadastro do aplicativo de estudos Órbita. Converta o pedido do usuário em dados estruturados. Responda APENAS com JSON válido, sem markdown e sem explicações. Use somente estas chaves de topo quando aplicáveis: materias, tarefas, provas, revisoes, biblioteca, metas. Formatos: materias [{"titulo":"...","tipo":"materia"}]; tarefas [{"titulo":"...","materia":"...","data":"AAAA-MM-DD","prioridade":"alta|media|baixa","periodo":"manha|tarde|noite","repeticao":"nenhuma|diaria|uteis|semanal","nota":"..."}]; provas e revisoes com titulo, materia e data; biblioteca com titulo, materia, categoria, link e nota; metas com titulo, valor e unidade. Não apague, não edite registros existentes, não invente datas ou conteúdo quando o pedido não permitir deduzir. Hoje: ${String(body.context?.today || "não informado")}. Matérias existentes: ${JSON.stringify(body.context?.subjects || [])}. Tarefas pendentes: ${JSON.stringify(body.context?.pendingTasks || [])}. Preferências aprendidas: ${String(body.context?.preferences || "nenhuma").slice(0, 4000)}. Pedido: ${String(body.command || "").slice(0, 20000)}`
      : `Você é o Tutor IA do aplicativo Órbita. Responda em português do Brasil. ${task}\n\n${pageText(body.page || {})}`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") || "gpt-5-mini", input }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.message || "Erro na API da IA");
    const text = result.output_text || (result.output || []).flatMap((item: any) => item.content || []).map((part: any) => part.text || "").join("\n").trim();
    return Response.json({ text }, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erro inesperado" }, { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
