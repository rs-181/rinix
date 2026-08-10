Rinix Agency Website

A premium, modern agency website built with vanilla HTML, CSS, and JavaScript. Features a dark theme, smooth animations, PWA support, and a fully responsive design.

https://rinix.netlify.app/og-image.png

🚀 Live Demo

rinix.netlify.app

✨ Features

· Modern Design – Dark theme with gradient accents and smooth animations
· Fully Responsive – Works flawlessly on mobile, tablet, and desktop
· PWA Ready – Installable as a native app on mobile devices
· Portfolio Showcase – Dynamic project cards rendered from JavaScript
· Contact Form – Integrated with Netlify Forms, includes validation
· Interactive Navigation – Sticky header with mobile hamburger menu
· Scroll Animations – Intersection Observer-based reveal effects
· Performance Optimized – Lighthouse 95+ target, lazy loading images
· SEO Friendly – Schema markup, meta tags, and semantic HTML
· Service Worker – Offline support and caching

📁 Project Structure

```
rinix-agency/
├── index.html          # Main HTML document
├── 404.html            # Custom 404 error page
├── style.css           # Core styles
├── responsive.css      # Responsive breakpoints
├── app.js              # Main JavaScript functionality
├── sw.js               # Service Worker
├── sw-register.js      # Service Worker registration
├── manifest.json       # PWA manifest
├── logo.png            # Brand logo
├── icon-192.png        # PWA icon (192x192)
├── icon-512.png        # PWA icon (512x512)
└── favicon.ico         # Browser favicon
```

🛠️ Technologies Used

· HTML5 – Semantic markup
· CSS3 – Custom properties, flexbox, grid, animations
· JavaScript (ES6) – Vanilla JS, no dependencies
· Google Fonts – Outfit & Inter
· Font Awesome – Premium icons
· Netlify Forms – Form handling
· PWA – Service Worker & Manifest

🎨 Design System

Colors

· --bg-primary: #0A0A0C
· --accent-blue: #00D2FF
· --accent-violet: #7C3AED
· --accent-magenta: #C026D3
· Gradient: Blue → Violet → Magenta

Typography

· Headings: Outfit
· Body: Inter

Spacing Scale

· Based on rem units: 0.5, 1, 1.5, 2, 3, 4.5, 7

📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rinix-agency.git

# Navigate to the project
cd rinix-agency

# Open in browser
open index.html
```

🔧 Configuration

Netlify Forms

The contact form is configured for Netlify. To use it:

1. Deploy to Netlify
2. Netlify automatically detects the form
3. Check your Netlify dashboard for submissions

PWA Setup

1. Replace placeholder images with your own:
   · icon-192.png
   · icon-512.png
   · logo.png
2. Update manifest.json with your app details
3. Update sw.js with your asset list

Analytics

Uncomment and add your Google Analytics ID in index.html:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
```

🚀 Deployment

Netlify (Recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

Or simply drag-and-drop the project folder to Netlify's dashboard.

Manual Deployment

Upload all files to your web host. Ensure the following files are included:

· All .html, .css, .js files
· Image assets (logo, icons, portfolio images)
· manifest.json
· sw.js

📱 Progressive Web App

The site is installable as a PWA. Key features:

· Offline Support – Core assets cached
· Install Prompt – Shows when user visits multiple times
· Mobile-First – Optimized for touch interactions
· Standalone Mode – App-like experience when installed

🔍 SEO Features

· Meta tags for social sharing (Open Graph, Twitter Cards)
· JSON-LD Schema Markup:
  · Organization
  · Services
  · FAQ Page
· Semantic HTML5 structure
· Canonical URLs
· Mobile-friendly
· Fast loading with lazy loading

📝 Adding Projects

Edit the portfolioProjects array in app.js:

```javascript
const portfolioProjects = [
  {
    title: 'Your Project',
    description: 'Project description',
    category: 'Category',
    tags: ['Tag1', 'Tag2'],
    image: 'image-name.png',
    url: 'https://project-url.com'
  }
];
```

⚡ Performance

· Lighthouse Score: 95+ target
· Core Web Vitals: Optimized
· Bundle Size: Minimal (~15KB for JS/CSS combined)
· No Dependencies: Zero external library overhead
· Image Lazy Loading: Native lazy loading
· Font Loading: Preconnect and optimized Google Fonts

🌐 Browser Support

· Chrome (latest)
· Firefox (latest)
· Safari (latest)
· Edge (latest)
· Opera (latest)
· Mobile browsers (iOS Safari, Android Chrome)

📄 License

This project is proprietary. All rights reserved.

👥 Contact

For any questions or support:

· Email: contact.rinix@proton.me
· Instagram: @rinix.netlify.app

---

Built with ❤️ by Rinix Agency
