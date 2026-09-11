# IEEE CS · SUSL — Next.js Website

A modern, high-performance Next.js web application for the **IEEE Computer Society Chapter at Sabaragamuwa University of Sri Lanka**, converted from the static HTML project.

## 🚀 Features

- **Next.js 14 App Router** with full TypeScript support and 100% static page prerendering (`SSG`).
- **Modern Design System**: Preserves the original brand identity (`--blue`, `--orange`, `--navy`, Montserrat & Open Sans typography, dark & light themes).
- **Interactive Components**:
  - **Navbar**: Sticky with glassmorphism on scroll, responsive mobile drawer, and client-side dark/light mode toggle with `localStorage` persistence.
  - **Animated Stat Counter**: Smooth cubic-eased numerical count-up when scrolling into view.
  - **Tilt Cards**: 3D perspective hover tilt effect.
  - **Magnetic Buttons**: Interactive subtle cursor pull effect.
  - **Event Filter Grid**: Dynamic category filtering (`All`, `Upcoming`, `Past`, `Flagship`).
  - **FAQ Accordion**: Smooth collapsible panels with rotating indicators.
  - **Leadership Accordion**: Collapsible past committee history.
  - **Gallery & Lightbox**: Responsive masonry image grid with click-to-zoom modal lightbox and keyboard controls.
  - **Contact Form**: Client-side interactive inquiry form with validation and feedback alerts.

## 📂 Project Structure

```
.
├── app/
│   ├── layout.tsx         # Global layout with Navbar, Footer & theme bootstrap
│   ├── globals.css        # Global CSS variables, animations & design system
│   ├── page.tsx           # Home page (Hero, Stats, Highlights, Advisor preview)
│   ├── about/page.tsx     # Mission, Vision, Chapter Context & History Timeline
│   ├── events/page.tsx    # Filterable events archive
│   ├── leadership/page.tsx# Faculty Advisor, Executive Committee & Past Committees
│   ├── resources/page.tsx # Workshop kits, IEEEXtreme cheat sheets & IEEE Xplore
│   ├── membership/page.tsx# 3-step joining roadmap, member perks & FAQ
│   ├── gallery/page.tsx   # Photo gallery with interactive lightbox
│   └── contact/page.tsx   # Interactive contact form & SUSL location details
├── components/
│   ├── Navbar.tsx         # Main header with official logo, theme toggle & mobile drawer
│   ├── Footer.tsx         # Site footer with official logo, links & copyright
│   ├── StatsCounter.tsx   # IntersectionObserver-based counter animation
│   ├── TiltCard.tsx       # 3D hover tilt card component
│   ├── MagneticButton.tsx # Magnetic attraction button/link
│   ├── EventFilterGrid.tsx# Filterable cards (All / Upcoming / Past / Flagship)
│   ├── FaqAccordion.tsx   # Expandable FAQ component
│   ├── LeadershipAccordion.tsx # Collapsible past committee lists
│   ├── GalleryLightbox.tsx# Image grid with zoom modal
│   └── ContactForm.tsx    # Contact inquiry form with feedback
├── public/
│   └── images/
│       └── logo.png       # IEEE Computer Society SUSL chapter logo
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## 🛠️ Development & Production

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build Production Bundle
```bash
npm run build
```

### Start Production Server
```bash
npm run start
```
