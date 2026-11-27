(() => {
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date = value => new Date(value + (String(value).length===10 ? "T00:00:00" : "")).toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});
  async function load() {
    try {
      const response=await fetch("/api/public");
      if(!response.ok) return;
      const data=await response.json();
      const news=document.querySelector("[data-live-news]");
      if(news && data.news.length) news.innerHTML=data.news.map(n=>`<article class="news-item"><span class="date">${esc(n.category)} · ${date(n.created_at)}</span><strong>${esc(n.title)}</strong><p>${esc(n.excerpt)}</p></article>`).join("");
      const members=document.querySelector("[data-live-members]");
      if(members && data.members.length) members.innerHTML=data.members.map(m=>`<article class="card"><div class="card-icon">✦</div><h3>${esc(m.minecraft_name)}</h3><span class="chip">${esc(m.rank)}</span><p>${esc(m.description)}</p></article>`).join("");
      const calendar=document.querySelector("[data-live-calendar]");
      if(calendar && data.calendar.length) {
        data.calendar.forEach(d=>{const door=document.querySelectorAll(".calendar-day")[d.day-1];if(door)door.innerHTML=String(d.day).padStart(2,"0")+"<span>OPEN</span>";});
        calendar.innerHTML=data.calendar.map(d=>`<article class="news-item"><span class="date">TÜRCHEN ${d.day}</span><strong>${esc(d.title)}</strong><p>${esc(d.content)}</p></article>`).join("");
      }
    } catch(error) { console.error("PoisonPulse API:",error); }
  }
  const form=document.querySelector("[data-application-form]");
  if(form) form.addEventListener("submit",async event=>{
    event.preventDefault();
    const status=form.querySelector("[data-form-status]");
    const values=Object.fromEntries(new FormData(form).entries());
    status.textContent="Wird gesendet …";
    try {
      const response=await fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const result=await response.json();
      status.textContent=response.ok?"Bewerbung gesendet! Wir melden uns über Discord.":(result.error||"Senden fehlgeschlagen.");
      if(response.ok)form.reset();
    } catch { status.textContent="Server nicht erreichbar. Bitte versuche es später erneut."; }
  });
  load();
})();
