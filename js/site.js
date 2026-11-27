(() => {
  const cfg = window.PP_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabaseAnonKey &&
    !cfg.supabaseUrl.includes("YOUR_PROJECT") && !cfg.supabaseAnonKey.includes("YOUR_");
  if (!configured || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date = value => new Date(value).toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});
  async function loadNews() {
    const target = document.querySelector("[data-live-news]");
    if (!target) return;
    const {data,error} = await db.from("news").select("id,title,category,excerpt,created_at").eq("published",true).order("created_at",{ascending:false}).limit(5);
    if (error || !data?.length) return;
    target.innerHTML = data.map(n => `<article class="news-item"><span class="date">${esc(n.category)} · ${date(n.created_at)}</span><strong>${esc(n.title)}</strong><p>${esc(n.excerpt)}</p></article>`).join("");
  }
  async function loadMembers() {
    const target = document.querySelector("[data-live-members]");
    if (!target) return;
    const {data,error} = await db.from("clan_members").select("minecraft_name,rank,description").eq("active",true).order("sort_order");
    if (error || !data?.length) return;
    target.innerHTML = data.map(m => `<article class="card"><div class="card-icon">✦</div><h3>${esc(m.minecraft_name)}</h3><span class="chip">${esc(m.rank)}</span><p>${esc(m.description)}</p></article>`).join("");
  }
  async function loadCalendar() {
    const target = document.querySelector("[data-live-calendar]");
    if (!target) return;
    const {data} = await db.from("advent_calendar").select("day,title,content").eq("published",true).lte("reveal_at",new Date().toISOString().slice(0,10)).order("day");
    if (!data?.length) return;
    data.forEach(d => { const door = document.querySelectorAll(".calendar-day")[d.day - 1]; if (door) door.innerHTML = String(d.day).padStart(2,"0") + "<span>OPEN</span>"; });
    target.innerHTML = data.map(d => `<article class="news-item"><span class="date">TÜRCHEN ${d.day}</span><strong>${esc(d.title)}</strong><p>${esc(d.content)}</p></article>`).join("");
  }
  const form = document.querySelector("[data-application-form]");
  if (form) form.addEventListener("submit", async event => {
    event.preventDefault();
    const status = form.querySelector("[data-form-status]");
    const values = Object.fromEntries(new FormData(form).entries());
    const age = values.age ? Number(values.age) : null;
    const {error} = await db.from("applications").insert({
      minecraft_name: values.minecraft_name.trim(),
      discord_name: values.discord_name.trim(),
      age,
      message: values.message.trim()
    });
    status.textContent = error ? "Das hat leider nicht geklappt. Bitte versuche es später erneut oder melde dich auf Discord." : "Bewerbung gesendet! Wir melden uns über Discord.";
    if (!error) form.reset();
  });
  loadNews(); loadMembers(); loadCalendar();
})();
