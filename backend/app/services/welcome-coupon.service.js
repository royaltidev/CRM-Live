// Geração do cupom de incentivo ao cadastro (FSD seções 6.1 e 20, régua
// `first_identified_purchase`).
//
// O percentual de desconto é um parâmetro do Administrador SEM valor padrão
// no FSD: enquanto não for configurado, nenhum cupom é gerado e nenhuma
// mensagem de incentivo é enviada ("pending_configuration", mesmo padrão de
// rfm_criteria e message_cadence em outras fases).

const crypto = require('crypto');

const { crmPool } = require('../database/connection');
const automationSettingsService = require('./automation-settings.service');

const CODE_PREFIX = 'BEMVINDO-';
const MAX_CODE_ATTEMPTS = 5;
const COUPON_DESCRIPTION = 'Cupom de incentivo ao cadastro (primeira compra identificada)';

// Sufixo aleatório curto e legível para o cliente digitar/ler no WhatsApp:
// 8 caracteres em base32 (sem letras/dígitos ambíguos não é exigido pelo FSD,
// mas o alfabeto restrito evita confusão entre 0/O e 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCouponCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let suffix = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `${CODE_PREFIX}${suffix}`;
}

// Gera e persiste um cupom de desconto percentual para o cliente.
// Retorna null quando o percentual ainda não foi configurado pelo
// Administrador — quem chama NÃO deve enviar mensagem de cupom nesse caso.
async function generateWelcomeCoupon({ customerId, createdBy } = {}) {
  if (!customerId) {
    throw new Error('generateWelcomeCoupon requer customerId.');
  }
  if (!createdBy) {
    throw new Error('generateWelcomeCoupon requer createdBy (usuário responsável pelo cupom).');
  }

  const percent = await automationSettingsService.getWelcomeCouponDiscountPercent();
  if (percent === null || percent === undefined) {
    return null;
  }

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateCouponCode();

    try {
      // `valid_until` fica NULL de propósito: o FSD não define prazo de
      // validade para este cupom, e o sistema já trata NULL como "sem
      // expiração automática por data".
      await crmPool.query(
        `INSERT INTO coupons
           (code, description, discount_type, discount_value, valid_from, valid_until, status, created_by)
         VALUES ($1, $2, 'percent', $3, NOW(), NULL, 'active', $4)`,
        [code, COUPON_DESCRIPTION, percent, createdBy]
      );

      return { code, discountPercent: percent };
    } catch (err) {
      // 23505 = unique_violation (coupons.code): código sorteado já existe,
      // sorteia outro. Qualquer outro erro do banco é real e sobe com
      // contexto.
      if (err && err.code === '23505') {
        continue;
      }
      throw new Error(
        `Falha ao gerar cupom de incentivo ao cadastro para o cliente ${customerId}: ${err.message}`
      );
    }
  }

  throw new Error(
    `Não foi possível gerar um código de cupom único após ${MAX_CODE_ATTEMPTS} tentativas ` +
      `(cliente ${customerId}).`
  );
}

module.exports = {
  generateWelcomeCoupon,
};
