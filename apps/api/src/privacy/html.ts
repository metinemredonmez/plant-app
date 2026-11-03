/** Everything that reaches a page goes through this. */
export const esc = (text: string | number | null | undefined) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STYLE = `
:root { color-scheme: light dark; --ink: #23374a; --muted: #5f7180; --bg: #f3f7f3; --card: #fff; --brand: #43707a; --line: #d6dedb; --bad: #a12a2a; }
@media (prefers-color-scheme: dark) { :root { --ink: #e6efea; --muted: #a6b5ad; --bg: #0e1613; --card: #18231f; --brand: #7fb0b5; --line: #2c3a35; --bad: #ee9a9a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
main { max-width: 640px; margin: 0 auto; padding: 24px 16px 64px; }
.brand { font-size: 12px; font-weight: 600; letter-spacing: .15em; color: var(--brand); text-decoration: none; }
h1 { font-size: 28px; line-height: 1.2; margin: 8px 0 16px; }
h2 { font-size: 18px; margin: 24px 0 4px; }
p { margin: 8px 0; }
.muted { color: var(--muted); font-size: 14px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 20px; margin: 16px 0; }
.bad { color: var(--bad); font-weight: 600; }
label { display: block; font-weight: 600; font-size: 14px; margin: 16px 0 4px; }
input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font: inherit; background: var(--bg); color: var(--ink); }
input[type=checkbox] { width: auto; margin-right: 8px; }
.check { display: flex; align-items: flex-start; font-weight: 400; }
.trap { position: absolute; left: -9999px; }
button { margin-top: 20px; padding: 12px 20px; border: 0; border-radius: 999px; background: var(--brand); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
button.danger { background: var(--bad); }
a { color: var(--brand); }
footer { margin-top: 32px; font-size: 14px; color: var(--muted); }
`;

/** A complete page. `body` is already escaped HTML; no script runs here. */
export function page(title: string, body: string) {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · EverBloom</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<a class="brand" href="/yasal">EVERBLOOM</a>
<h1>${esc(title)}</h1>
${body}
<footer><a href="/yasal">Yasal metinler</a> · <a href="/kvkk-basvuru">KVKK başvurusu</a> · <a href="/hesap-silme">Hesap silme</a></footer>
</main>
</body>
</html>`;
}
