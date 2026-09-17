// La hoja de estilos de la agenda, inyectada como <style> desde la página.
// Va aparte del entry de Tailwind para no tocar el cableado del andamiaje.
export const AGENDA_CSS = `
.ag-root{
  --ink:#2A1C24; --ink-soft:#6B5762; --ink-faint:#9A8791;
  --ground:#FBF7F8; --surface:#FFFFFF; --surface-2:#F4EDF0;
  --line:#E7DBE1; --line-strong:#D5C3CC;
  --accent:#B21E5F; --accent-soft:#F7E4EC; --accent-ink:#FFFFFF;
  --ok:#1F7A55; --ok-soft:#E1F1E9;
  --warn:#A3651A; --warn-soft:#FBEBD6;
  --danger:#B3322C; --danger-soft:#FAE3E1;
  --shadow:0 1px 2px rgba(42,28,36,.06), 0 8px 24px -12px rgba(42,28,36,.18);
  --radius:14px;
  background:var(--ground); color:var(--ink); min-height:100dvh;
  font-family:"Karla","Helvetica Neue",Arial,sans-serif; font-size:15px; line-height:1.45;
  -webkit-font-smoothing:antialiased;
}
.ag-root *{box-sizing:border-box}
.ag-root h1,.ag-root h2,.ag-root h3{
  font-family:"Bricolage Grotesque","Karla",Georgia,serif; font-weight:800; margin:0;
  text-wrap:balance; letter-spacing:-.015em;
}
.ag-num{font-variant-numeric:tabular-nums}
.ag-wrap{max-width:900px;margin:0 auto;padding-inline:16px;padding-block:0 96px}

.ag-top{
  position:sticky;top:0;z-index:30;background:rgba(251,247,248,.94);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--line);
  margin-inline:-16px;padding-inline:16px;padding-block:14px 12px;
}
.ag-brandrow{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ag-brand{font-size:21px}
.ag-brand span{color:var(--accent)}
.ag-who{font-size:12.5px;color:var(--ink-soft);display:flex;align-items:center;gap:8px}

.ag-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.ag-stat{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:9px 11px}
.ag-stat b{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);display:block;font-weight:700}
.ag-stat i{font-family:"Bricolage Grotesque","Karla",serif;font-weight:800;font-size:17px;font-style:normal;display:block;margin-top:2px;font-variant-numeric:tabular-nums}
.ag-stat.due i{color:var(--warn)}
.ag-stat.paid i{color:var(--ok)}

.ag-toolbar{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}
.ag-tabs{display:flex;gap:6px;overflow-x:auto;flex:1 1 240px;scrollbar-width:none}
.ag-tabs::-webkit-scrollbar{display:none}
.ag-tab{border:1px solid var(--line-strong);background:transparent;color:var(--ink-soft);
  border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;white-space:nowrap;cursor:pointer}
.ag-tab[aria-selected="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:700}
.ag-search{flex:1 1 150px;min-width:120px;border:1px solid var(--line-strong);background:var(--surface);
  color:var(--ink);border-radius:999px;padding:7px 12px;font:inherit;font-size:13.5px}

.ag-root :focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.ag-banner{margin-top:14px;border:1px dashed var(--line-strong);border-radius:var(--radius);
  padding:10px 13px;font-size:13px;color:var(--ink-soft);background:var(--surface-2)}
.ag-banner b{color:var(--ink)}
.ag-banner.bad{border-style:solid;border-color:var(--danger);color:var(--danger);background:var(--danger-soft)}

.ag-daygroup{margin-top:22px}
.ag-dayhead{display:flex;align-items:baseline;gap:9px;margin-bottom:9px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.ag-dayhead .d{font-family:"Bricolage Grotesque","Karla",serif;font-weight:800;font-size:15px}
.ag-dayhead .rel{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);font-weight:700}
.ag-dayhead .cnt{margin-left:auto;font-size:12px;color:var(--ink-faint);font-variant-numeric:tabular-nums}

.ag-cards{display:flex;flex-direction:column;gap:10px}
.ag-card{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:13px 14px 13px 17px;overflow:hidden}
.ag-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--ok)}
.ag-card.owes::before{background:var(--warn)}
.ag-card.unpaid::before{background:var(--danger)}
.ag-card.off{opacity:.55}
.ag-card.off::before{background:var(--ink-faint)}

.ag-cardtop{display:flex;gap:10px;align-items:flex-start}
.ag-hour{font-family:"Bricolage Grotesque","Karla",serif;font-weight:800;font-size:17px;
  font-variant-numeric:tabular-nums;line-height:1.15;min-width:64px}
.ag-hour small{display:block;font-family:"Karla",sans-serif;font-weight:500;font-size:10.5px;
  color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.ag-whoblock{flex:1;min-width:0}
.ag-name{font-family:"Bricolage Grotesque","Karla",serif;font-weight:600;font-size:16px;word-break:break-word}
.ag-svc{font-size:13px;color:var(--ink-soft)}
.ag-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.ag-chip{font-size:11px;padding:2.5px 8px;border-radius:999px;white-space:nowrap;border:1px solid transparent}
.ag-chip.place{background:var(--surface-2);color:var(--ink-soft);border-color:var(--line)}
.ag-chip.state{background:var(--accent-soft);color:var(--accent);font-weight:700}
.ag-chip.ok{background:var(--ok-soft);color:var(--ok);font-weight:700}
.ag-chip.warn{background:var(--warn-soft);color:var(--warn);font-weight:700}
.ag-chip.danger{background:var(--danger-soft);color:var(--danger);font-weight:700}

.ag-money{display:flex;gap:14px;flex-wrap:wrap;margin-top:11px;padding-top:10px;border-top:1px solid var(--line)}
.ag-money>div{min-width:84px}
.ag-money b{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-faint);font-weight:700}
.ag-money i{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums;font-size:14.5px}
.ag-money .owe{flex:1;text-align:right}
.ag-money i.big{font-family:"Bricolage Grotesque","Karla",serif;font-weight:800;font-size:21px;line-height:1.15}
.ag-money i.due{color:var(--warn)}
.ag-money i.clear{color:var(--ok)}
.ag-money small{color:var(--ink-faint);font-weight:400;font-size:11.5px}

.ag-thumbs{display:flex;gap:6px;margin-top:11px;flex-wrap:wrap}
.ag-thumb{width:56px;height:56px;border-radius:9px;object-fit:cover;border:1px solid var(--line);
  cursor:zoom-in;background:var(--surface-2)}
.ag-note{margin-top:10px;font-size:13px;color:var(--ink-soft);background:var(--surface-2);
  border-radius:9px;padding:8px 10px;white-space:pre-wrap;word-break:break-word}

.ag-actions{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}
.ag-btn{font:inherit;font-size:13px;border-radius:9px;padding:6.5px 12px;cursor:pointer;
  border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);text-decoration:none;display:inline-block}
.ag-btn:hover{border-color:var(--accent);color:var(--accent)}
.ag-btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:700}
.ag-btn.primary:hover{opacity:.9;color:var(--accent-ink)}
.ag-btn.ghost{border-color:transparent;color:var(--ink-faint)}
.ag-btn.ghost:hover{color:var(--danger);border-color:var(--danger)}
.ag-btn:disabled{opacity:.5;cursor:not-allowed}

.ag-empty{text-align:center;padding:48px 16px;color:var(--ink-faint)}
.ag-empty h3{font-size:17px;color:var(--ink);margin-bottom:6px}

.ag-fab{position:fixed;right:16px;bottom:16px;z-index:40;background:var(--accent);color:var(--accent-ink);
  border:none;border-radius:999px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;
  cursor:pointer;box-shadow:0 10px 26px -10px rgba(178,30,95,.75)}

.ag-scrim{position:fixed;inset:0;background:rgba(30,16,24,.55);backdrop-filter:blur(3px);z-index:50;
  display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto}
.ag-sheet{background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);
  width:100%;max-width:600px;margin:auto}
.ag-sheet header{position:sticky;top:0;background:var(--surface);border-bottom:1px solid var(--line);
  padding:15px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;
  border-radius:18px 18px 0 0;z-index:2}
.ag-sheet header h2{font-size:18px}
.ag-sheet .body{padding:16px 18px 20px}
.ag-sheet footer{position:sticky;bottom:0;background:var(--surface);border-top:1px solid var(--line);
  padding:12px 18px;display:flex;gap:8px;justify-content:flex-end;border-radius:0 0 18px 18px}

.ag-set{border:none;margin:0 0 16px;padding:0}
.ag-set legend{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-faint);
  font-weight:700;padding:0 0 8px}
.ag-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ag-grid .full{grid-column:1/-1}
.ag-f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--ink-soft);font-weight:700}
.ag-f input,.ag-f select,.ag-f textarea{font:inherit;font-size:14.5px;color:var(--ink);background:var(--surface);
  border:1px solid var(--line-strong);border-radius:9px;padding:8px 10px;width:100%}
.ag-f textarea{min-height:76px;resize:vertical}
.ag-f input[type="number"]{font-variant-numeric:tabular-nums}
.ag-hint{font-size:11.5px;color:var(--ink-faint);font-weight:400}

.ag-balance{background:var(--surface-2);border:1px solid var(--line);border-radius:11px;padding:11px 13px;
  display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.ag-balance b{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:700}
.ag-balance i{font-family:"Bricolage Grotesque","Karla",serif;font-weight:800;font-size:20px;
  font-style:normal;font-variant-numeric:tabular-nums;display:block}
.ag-balance i.big{font-size:26px}

.ag-photos{display:flex;flex-wrap:wrap;gap:8px}
.ag-slot{position:relative;width:78px;height:78px;border-radius:10px;overflow:hidden;border:1px solid var(--line);
  background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink-faint)}
.ag-slot img{width:100%;height:100%;object-fit:cover;display:block}
.ag-slot button{position:absolute;top:3px;right:3px;width:21px;height:21px;border-radius:50%;border:none;
  background:rgba(20,10,16,.72);color:#fff;font-size:13px;line-height:1;cursor:pointer;padding:0}
.ag-add{width:78px;height:78px;border-radius:10px;border:1px dashed var(--line-strong);background:transparent;
  color:var(--ink-faint);font:inherit;font-size:11.5px;cursor:pointer;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:3px}
.ag-add:hover{border-color:var(--accent);color:var(--accent)}
.ag-add span{font-size:19px;line-height:1}

.ag-lightbox{position:fixed;inset:0;background:rgba(18,9,14,.92);z-index:60;display:flex;align-items:center;
  justify-content:center;padding:20px;cursor:zoom-out}
.ag-lightbox img{max-width:100%;max-height:100%;border-radius:10px}

.ag-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:84px;background:var(--ink);color:var(--ground);
  padding:9px 16px;border-radius:999px;font-size:13.5px;z-index:70;box-shadow:var(--shadow);max-width:90%;
  text-align:center}

.ag-gate{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px}
.ag-gatebox{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--line);
  border-radius:18px;box-shadow:var(--shadow);padding:24px}
.ag-gatebox h1{font-size:24px;margin-bottom:4px}
.ag-gatebox p{color:var(--ink-soft);font-size:13.5px;margin:0 0 18px}
.ag-gateform{display:flex;flex-direction:column;gap:12px}
.ag-gateform .ag-btn{width:100%;padding:11px;font-size:15px;text-align:center}
.ag-err{color:var(--danger);background:var(--danger-soft);border-radius:9px;padding:8px 10px;font-size:13px}

.ag-foot{margin-top:34px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-faint)}
.ag-userlist{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.ag-userrow{display:flex;align-items:center;gap:10px;background:var(--surface-2);border-radius:9px;padding:8px 11px;font-size:13.5px}
.ag-userrow .tag{margin-left:auto;font-size:11px;color:var(--ink-faint)}

@media (max-width:520px){
  .ag-grid{grid-template-columns:1fr}
  .ag-stats{grid-template-columns:1fr}
}
@media (prefers-reduced-motion: no-preference){
  .ag-toast{animation:ag-rise .22s ease-out}
  @keyframes ag-rise{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
}
`;
