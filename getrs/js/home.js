const FEATURES = [
  { icon: "🧩", title: "100% visual builder", description: "Drag blocks onto the page — headings, text, images, video, embeds, sliders. No code editor, ever." },
  { icon: "📄", title: "Multi-page sites", description: "Add as many pages as you need — Home, About, Contact — all linked together automatically." },
  { icon: "🎨", title: "Make it yours", description: "Custom background colors and images, text colors and sizes — your site, your look." },
  { icon: "🔒", title: "Password protection", description: "Lock a site behind a password when you're not ready for the whole world to see it yet." },
  { icon: "📱", title: "Mobile-first", description: "Every site you build looks sharp on phones, tablets, and desktops without any extra work." },
  { icon: "🚀", title: "Free hosting, instantly", description: "Publish to your own URL the moment you hit save — no servers, no config, no cost." },
];

const grid = document.getElementById("features-grid");
FEATURES.forEach((f) => {
  const card = document.createElement("div");
  card.className = "card p-6";
  card.innerHTML = `
    <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-charcoal-800 text-xl">${f.icon}</div>
    <h3 class="mb-1 font-display font-bold"></h3>
    <p class="text-sm text-charcoal-300"></p>
  `;
  card.querySelector("h3").textContent = f.title;
  card.querySelector("p").textContent = f.description;
  grid.appendChild(card);
});
