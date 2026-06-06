'use strict';

/* Validación de tipo de archivo por "magic bytes" (firma binaria real),
   no por el Content-Type/extensión declarados por el cliente —ambos son
   trivialmente falsificables y permitirían subir, p. ej., un HTML/SVG con
   script disfrazado de imagen. Se compara contra la firma esperada del
   mimetype que el propio cliente declaró, así que un archivo cuyo
   contenido no coincide con lo que dice ser es rechazado. */

const SIGNATURES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // 'RIFF'; bytes 8-11 = 'WEBP'
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // '%PDF'
};

function matchesSignature(buffer, signature) {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/**
 * Verifica que el contenido binario de `buffer` corresponda a la firma
 * esperada para `declaredMimetype`. Devuelve `false` si el mimetype no
 * está soportado o si ninguna firma coincide.
 */
function isValidFileSignature(buffer, declaredMimetype) {
  const signatures = SIGNATURES[declaredMimetype];
  if (!signatures) return false;

  if (declaredMimetype === 'image/webp') {
    return (
      matchesSignature(buffer, signatures[0]) &&
      buffer.length >= 12 &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP'
    );
  }

  return signatures.some((sig) => matchesSignature(buffer, sig));
}

module.exports = { isValidFileSignature };
