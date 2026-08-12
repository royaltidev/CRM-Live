// Detecção do tipo real de imagem pelo conteúdo binário (magic bytes),
// não pela extensão/mimetype informado pelo cliente — exigência de
// segurança da FSD (seção 21): "o backend deve validar o tipo real do
// arquivo... antes de aceitar o upload".
//
// Cobre só os 3 formatos permitidos para anexo de template (FSD seção 21):
// JPEG, PNG, WEBP. Implementado sem dependência externa (assinaturas bem
// conhecidas e estáveis) para evitar problemas de compatibilidade ESM/CJS
// de bibliotecas de detecção de tipo de arquivo.

const SIGNATURES = [
  { mimeType: 'image/jpeg', extension: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', extension: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

// WEBP não tem prefixo fixo simples: precisa checar "RIFF" nos primeiros 4
// bytes e "WEBP" nos bytes 8-11 (com o tamanho do arquivo no meio).
function isWebp(buffer) {
  if (buffer.length < 12) {
    return false;
  }
  const riff = buffer.slice(0, 4).toString('ascii');
  const webp = buffer.slice(8, 12).toString('ascii');
  return riff === 'RIFF' && webp === 'WEBP';
}

function matchesSignature(buffer, signatureBytes) {
  if (buffer.length < signatureBytes.length) {
    return false;
  }
  return signatureBytes.every((byte, index) => buffer[index] === byte);
}

// Retorna { mimeType, extension } do tipo real detectado, ou `null` se o
// conteúdo não corresponder a nenhum dos formatos permitidos.
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  for (const signature of SIGNATURES) {
    if (matchesSignature(buffer, signature.bytes)) {
      return { mimeType: signature.mimeType, extension: signature.extension };
    }
  }

  if (isWebp(buffer)) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  return null;
}

module.exports = {
  detectImageType,
};
