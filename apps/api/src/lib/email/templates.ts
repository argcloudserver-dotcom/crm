export const brandColor = "#C9A84C";
export const bgColor = "#0F172A";

export function baseTemplate(content: string): string {
  return `
    <div style="background:${bgColor};min-height:100vh;padding:40px 0;font-family:'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:auto;background:#1E293B;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4)">
        <div style="background:${brandColor};padding:24px 32px;text-align:center">
          <h1 style="margin:0;color:#0F172A;font-size:22px;font-weight:700;letter-spacing:1px">PropOS CRM</h1>
        </div>
        <div style="padding:32px">
          ${content}
        </div>
        <div style="padding:16px 32px;border-top:1px solid #334155;text-align:center">
          <p style="margin:0;color:#64748B;font-size:12px">© 2026 PropOS CRM · TIL Real Estate Group</p>
        </div>
      </div>
    </div>
  `;
}
