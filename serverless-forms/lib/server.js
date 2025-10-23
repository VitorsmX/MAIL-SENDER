const express = await import("express");
const fs = await import("fs").promises;
const rateLimit = await import("express-rate-limit");
const { processForm } = await import("./post.js");

/**
 * Inicializa o servidor Express mantendo compatibilidade
 * com a função startServer(options)
 */
function startServer(options) {
  const app = express();

  // === Configurações ===
  const PORT = options.port || 8080;
  const FORM_PATH = options.form || "public/form.html";

  // === Middlewares ===

  // Limite de 10 requisições por minuto por IP
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10,
    message:
      "⚠️ Limite de 10 solicitações por minuto atingido. Aguarde antes de tentar novamente.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // === Rotas ===

  // Rota GET -> Exibir o formulário
  app.get("/", async (req, res) => {
    try {
      const data = await fs.readFile(FORM_PATH, "utf8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(data);
    } catch {
      res.status(404).send("❌ Formulário não encontrado.");
    }
  });

  // Rota POST -> Processar formulário
  app.post("/", async (req, res) => {
    try {
      await processForm(req, res, options);
    } catch (err) {
      console.error("❌ Erro ao processar formulário:", err);
      res.status(500).send("Erro interno ao processar a solicitação.");
    }
  });

  // === Inicializa o servidor ===
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Express rodando em http://localhost:${PORT}`);
  });
}

export default startServer;
