import { describe, it, expect } from 'vitest';
import { loadCMSDB } from '../setup.js';

describe('escapeHTML() — protección XSS', () => {
  let escapeHTML;

  beforeEach(() => {
    const CMSDB = loadCMSDB();
    escapeHTML = CMSDB.escapeHTML;
  });

  it('escapa etiquetas <script>', () => {
    const input = '<script>alert(1)</script>';
    const output = escapeHTML(input);
    expect(output).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(output).not.toContain('<script>');
  });

  it('escapa atributos con onerror', () => {
    const input = '<img src=x onerror=alert(1)>';
    const output = escapeHTML(input);
    expect(output).not.toContain('<img');
    expect(output).toContain('&lt;img');
    expect(output).toContain('&gt;');
  });

  it('escapa URLs con javascript:', () => {
    const input = 'javascript:alert(1)';
    const output = escapeHTML(input);
    // No debe ejecutarse como URL — el texto es seguro como está
    expect(output).toBe('javascript:alert(1)'); // no tiene HTML que escapar
  });

  it('escapa comillas dobles', () => {
    const output = escapeHTML('"valor"');
    expect(output).toBe('&quot;valor&quot;');
  });

  it('escapa comillas simples', () => {
    const output = escapeHTML("'valor'");
    expect(output).toBe('&#x27;valor&#x27;');
  });

  it('escapa ampersands', () => {
    const output = escapeHTML('foo & bar');
    expect(output).toBe('foo &amp; bar');
  });

  it('retorna cadena vacía para null', () => {
    expect(escapeHTML(null)).toBe('');
  });

  it('retorna cadena vacía para undefined', () => {
    expect(escapeHTML(undefined)).toBe('');
  });

  it('convierte números a string seguro', () => {
    expect(escapeHTML(42)).toBe('42');
  });

  it('escapa payload complejo de inyección', () => {
    const xss = '"><script>document.cookie</script>';
    const output = escapeHTML(xss);
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('">');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('&quot;');
  });

  it('el resultado nunca ejecuta código al ser insertado en textContent', () => {
    const input = '<script>window.__xss_executed = true</script>';
    const safe = escapeHTML(input);

    const div = document.createElement('div');
    div.textContent = safe; // textContent nunca ejecuta scripts

    expect(window.__xss_executed).toBeUndefined();
    expect(div.textContent).toContain('&lt;script&gt;');
  });
});
