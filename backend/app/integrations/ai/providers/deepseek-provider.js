// Implementação do provedor DeepSeek para classificação de intenção de
// lead (ver ../index.js).
//
// IMPORTANTE: este é o ÚNICO arquivo do projeto que deve montar a chamada
// HTTP para a API do DeepSeek. Nenhum outro módulo deve fazer isso
// diretamente — todos devem usar backend/app/integrations/ai/index.js.
//
// API compatível com o formato OpenAI Chat Completions
// (POST /chat/completions) — https://api-docs.deepseek.com/.
// Usa fetch nativo do Node 22 (ver Dockerfile), sem dependência nova.

const settings = require('../../../config/settings');

const API_URL = 'https://api.deepseek.com/chat/completions';
const REQUEST_TIMEOUT_MS = 10000;
const VALID_CLASSIFICATIONS = ['purchase_intent', 'doubt', 'none'];

const SYSTEM_PROMPT = `Você analisa mensagens de WhatsApp recebidas de clientes de uma loja de varejo, para decidir se a mensagem deve ser encaminhada a um vendedor humano.

Classifique a mensagem em exatamente uma categoria:
- "purchase_intent": o cliente demonstra interesse em comprar algo (pergunta sobre disponibilidade, preço, quer fechar uma compra, pede para reservar um produto, etc.).
- "doubt": o cliente tem uma dúvida relacionada à loja, a um produto ou a um atendimento (horário, endereço, garantia, status de um pedido, etc.), sem necessariamente demonstrar intenção de compra.
- "none": a mensagem não se enquadra em nenhuma das anteriores (ex.: agradecimento, "ok", cumprimento sem contexto, mensagem sem relação com a loja).

Responda SOMENTE com um JSON no formato {"classification": "purchase_intent" | "doubt" | "none"}, sem nenhum texto adicional.`;

// Classifica a intenção de uma mensagem recebida do cliente. Lança erro em
// caso de configuração ausente, falha de rede, timeout ou resposta
// inesperada — quem chama decide o comportamento de fallback (ver
// inbox.service.js: por padrão, encaminha o lead mesmo em falha da IA, pra
// não arriscar perder um cliente por um problema técnico).
async function classifyLeadIntent({ messageBody }) {
  const apiKey = settings.ai && settings.ai.deepseek && settings.ai.deepseek.apiKey;
  if (!apiKey || apiKey === 'CHANGE_ME') {
    throw new Error('Chave de API do DeepSeek não configurada (settings.ai.deepseek.apiKey).');
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.ai.deepseek.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: messageBody || '' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 20,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`DeepSeek respondeu com status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content =
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!content) {
      throw new Error('Resposta do DeepSeek sem conteúdo.');
    }

    const parsed = JSON.parse(content);
    const classification = parsed.classification;

    if (!VALID_CLASSIFICATIONS.includes(classification)) {
      throw new Error(`Classificação inesperada do DeepSeek: ${JSON.stringify(parsed)}`);
    }

    return classification;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

const AFFINITY_SYSTEM_PROMPT = `Você analisa candidatos estatísticos de "produtos frequentemente comprados juntos" de uma loja de varejo, calculados a partir do histórico real de vendas (contagem de coocorrência e confiança já calculadas — você não recebe vendas individuais).

Para cada candidato, decida se ele representa uma relação de complementaridade genuína e acionável (útil para oferecer um desconto de cross-sell), ou se é provavelmente uma coincidência estatística (ex.: dois produtos populares que às vezes aparecem juntos sem relação de uso real). Rejeite pares que não fazem sentido como oferta comercial.

Para cada candidato ACEITO, escreva uma descrição curta (uma frase, em português) explicando por que faz sentido oferecer o complemento.

Responda SOMENTE com um JSON no formato:
{"suggestions": [{"productAId": <int>, "productBId": <int>, "accept": true|false, "description": "<string ou null se accept=false>"}]}

Inclua uma entrada para CADA candidato recebido, na mesma ordem.`;

// Refina candidatos estatísticos de produtos comprados juntos (Venda
// Inteligente). `candidates`: array de { productAId, productAName,
// productACategory, productBId, productBName, productBCategory,
// coOccurrence, confidence }. Lança erro em caso de configuração ausente,
// falha de rede, timeout ou resposta inesperada — quem chama decide o
// fallback (product-affinity.service.js usa todos os candidatos
// estatísticos sem filtro adicional quando a IA falha ou está desativada).
async function refineProductAffinitySuggestions({ candidates }) {
  const apiKey = settings.ai && settings.ai.deepseek && settings.ai.deepseek.apiKey;
  if (!apiKey || apiKey === 'CHANGE_ME') {
    throw new Error('Chave de API do DeepSeek não configurada (settings.ai.deepseek.apiKey).');
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.ai.deepseek.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: AFFINITY_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ candidates }) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`DeepSeek respondeu com status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content =
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!content) {
      throw new Error('Resposta do DeepSeek sem conteúdo.');
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.suggestions)) {
      throw new Error(`Resposta inesperada do DeepSeek: ${JSON.stringify(parsed)}`);
    }

    return parsed.suggestions;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

module.exports = {
  classifyLeadIntent,
  refineProductAffinitySuggestions,
};
