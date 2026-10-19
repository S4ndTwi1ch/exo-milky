# exo-milky

> An interactive astrophysical compendium exploring the architecture of the Milky Way galaxy, stellar populations, and exoplanetary systems.

## Overview

**The Sagittarius Deep Field Atlas** is a high-fidelity scientific web application built with modern web technologies, canvas physics, and generative audio synthesis.

### Features

- **3D Spiral Galaxy Particle Simulation**: Interactive Canvas model of logarithmic spiral arms (Perseus, Scutum-Centaurus, Sagittarius, Norma), central Galactic Bulge, and Sagittarius A* accretion disc with mouse parallax, orbital rotation, and zoom.
- **Galactic Chrono-Metrics & Anatomy**: Animated counters detailing galactic diameter, stellar population, system age, and distance to the Galactic Center, with stratified domain analysis (Bulge, Thin Disc, Thick Disc, Dark Matter Halo).
- **Exoplanetary Archive & Live Visualizer**: Filterable catalogue of landmark exoplanets (TRAPPIST-1e, Proxima Centauri b, Kepler-452b, WASP-12b, 55 Cancri e, Kepler-16b, HD 189733 b, K2-18b) with rotating procedural sphere canvas modals, habitability metrics, and atmospheric chemistry spectroscopy bars.
- **Transit Photometry & Light Curve Lab**: Interactive simulation of the Kepler/JWST transit method with limb-darkened host stars, customizable planetary radii, and real-time flux dip curve plotting.
- **Scale Studio**: Visual side-by-side cosmic comparator measuring relative diameters, masses, and surface gravity ratios.
- **Calm Celestial Ambient Music Engine**: Generative, tranquil ambient music composed of warm felt piano drops, cycling 4-chord pad progressions (Dmaj9, Gmaj7, Bm9, Aadd9), and stereo spatial delay synthesis via the Web Audio API.
- **Accessibility & Performance**: Full WCAG 2.2 AA compliance, keyboard navigation, high contrast ratios, and prefers-reduced-motion support.

## Tech Stack

- **Core**: Vanilla HTML5, CSS3, JavaScript (ES Modules)
- **Tooling & Bundler**: Vite
- **Animation**: Anime.js & Native HTML5 Canvas 2D
- **Audio**: Web Audio API (Generative Ambient Synth Engine)
- **Typography**: Google Fonts (Cinzel, Newsreader, Inter, JetBrains Mono)

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation & Run

`ash
# Clone the repository
git clone https://github.com/S4ndTwi1ch/exo-milky.git
cd exo-milky

# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build
`

## Scientific Data Sources

- NASA Exoplanet Archive
- ESA Gaia Data Release 3
- Event Horizon Telescope Collaboration (Sagittarius A*)
- James Webb Space Telescope (JWST) NIRSpec Consortia
