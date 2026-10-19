/**
 * EXOPLANETARY ARCHIVE SCIENTIFIC DATASET
 * Curated from NASA Exoplanet Archive & ESA Gaia Data
 */

export const EXOPLANETS = [
  {
    id: "trappist1e",
    name: "TRAPPIST-1e",
    hostStar: "TRAPPIST-1 (M8V Ultra-cool Dwarf)",
    type: "terrestrial",
    typeLabel: "Terrestrial / Earth Analog",
    habitability: "habitable",
    habitabilityLabel: "Conservative Habitable Zone",
    distanceLy: 39.46,
    distancePc: 12.1,
    massEarth: 0.692,
    radiusEarth: 0.920,
    orbitalPeriodDays: 6.10,
    semiMajorAxisAu: 0.029,
    surfaceTempK: 251,
    discoveryMethod: "Transit Photometry",
    discoveryYear: 2017,
    summary: "One of seven Earth-sized worlds orbiting the ultracool red dwarf TRAPPIST-1. It is likely rocky with a compact core, receiving 66% of the solar flux Earth receives, making it one of the premier targets for biosignature detection with JWST.",
    colorPalette: ["#4a6b82", "#2e485e", "#7b9bb0", "#182c3c"],
    atmosphere: [
      { name: "Nitrogen (N₂)", percent: 74, color: "#38B6BA" },
      { name: "Carbon Dioxide (CO₂)", percent: 18, color: "#E5A93C" },
      { name: "Water Vapor (H₂O)", percent: 6, color: "#5680E9" },
      { name: "Trace / Argon", percent: 2, color: "#8860D0" }
    ]
  },
  {
    id: "proximab",
    name: "Proxima Centauri b",
    hostStar: "Proxima Centauri (M5.5V Red Dwarf)",
    type: "terrestrial",
    typeLabel: "Terrestrial World",
    habitability: "habitable",
    habitabilityLabel: "Habitable Zone (Tidally Locked)",
    distanceLy: 4.24,
    distancePc: 1.30,
    massEarth: 1.07,
    radiusEarth: 1.03,
    orbitalPeriodDays: 11.19,
    semiMajorAxisAu: 0.049,
    surfaceTempK: 234,
    discoveryMethod: "Radial Velocity (Doppler)",
    discoveryYear: 2016,
    summary: "The closest known exoplanet to Earth. Orbiting in the habitable zone of our nearest stellar neighbor, it experiences strong stellar flare activity that challenges the long-term survival of a temperate atmosphere.",
    colorPalette: ["#7a5948", "#533829", "#b3886e", "#2e1b12"],
    atmosphere: [
      { name: "Carbon Dioxide (CO₂)", percent: 65, color: "#E5A93C" },
      { name: "Nitrogen (N₂)", percent: 28, color: "#38B6BA" },
      { name: "Methane (CH₄)", percent: 7, color: "#2EBA84" }
    ]
  },
  {
    id: "kepler452b",
    name: "Kepler-452b",
    hostStar: "Kepler-452 (G2V Solar Analog)",
    type: "super-earth",
    typeLabel: "Super-Earth",
    habitability: "habitable",
    habitabilityLabel: "Habitable Zone Candidate",
    distanceLy: 1799,
    distancePc: 552,
    massEarth: 5.0,
    radiusEarth: 1.63,
    orbitalPeriodDays: 384.8,
    semiMajorAxisAu: 1.046,
    surfaceTempK: 265,
    discoveryMethod: "Transit Photometry (Kepler)",
    discoveryYear: 2015,
    summary: "Frequently dubbed 'Earth's Older Cousin', Kepler-452b was the first near-Earth-size world discovered in the habitable zone of a G2V star identical in temperature to our Sun, though 1.5 billion years older.",
    colorPalette: ["#3b6e8c", "#284d63", "#76a7c4", "#132734"],
    atmosphere: [
      { name: "Water Vapor (H₂O)", percent: 45, color: "#5680E9" },
      { name: "Nitrogen (N₂)", percent: 35, color: "#38B6BA" },
      { name: "Carbon Dioxide (CO₂)", percent: 20, color: "#E5A93C" }
    ]
  },
  {
    id: "wasp12b",
    name: "WASP-12b",
    hostStar: "WASP-12 (F-type Subgiant)",
    type: "gas-giant",
    typeLabel: "Ultra-Hot Jupiter (Tidally Distorted)",
    habitability: "extreme",
    habitabilityLabel: "Extreme / Hostile (Cannibalized)",
    distanceLy: 1410,
    distancePc: 432,
    massEarth: 467.2,
    radiusEarth: 21.3,
    orbitalPeriodDays: 1.09,
    semiMajorAxisAu: 0.023,
    surfaceTempK: 2525,
    discoveryMethod: "Transit Photometry (SuperWASP)",
    discoveryYear: 2008,
    summary: "An ultra-hot gas giant orbiting so close to its star that tidal gravitational shear forces have stretched it into an egg-like oblate spheroid, while the star slowly strips its outer atmosphere into a circumstellar accretion disk.",
    colorPalette: ["#1c1a21", "#332a3b", "#e05a47", "#0a090d"],
    atmosphere: [
      { name: "Carbon Monoxide (CO)", percent: 55, color: "#E05A47" },
      { name: "Hydrogen Gas (H₂)", percent: 35, color: "#8860D0" },
      { name: "Helium (He)", percent: 10, color: "#E5A93C" }
    ]
  },
  {
    id: "cancri55e",
    name: "55 Cancri e (Janssen)",
    hostStar: "Copernicus (55 Cancri A, G8V)",
    type: "super-earth",
    typeLabel: "Ultra-Short Period Lava World",
    habitability: "extreme",
    habitabilityLabel: "Extreme / Magma Oceans",
    distanceLy: 41.06,
    distancePc: 12.6,
    massEarth: 7.99,
    radiusEarth: 1.87,
    orbitalPeriodDays: 0.736,
    semiMajorAxisAu: 0.015,
    surfaceTempK: 2250,
    discoveryMethod: "Radial Velocity & Transit",
    discoveryYear: 2004,
    summary: "A searing super-Earth with an ultra-short 18-hour orbit. Thermal emissions measured by Spitzer and JWST show a dayside magma ocean and a volatile-rich secondary atmosphere of carbon monoxide and carbon dioxide.",
    colorPalette: ["#bd4424", "#e8732a", "#521609", "#f2a641"],
    atmosphere: [
      { name: "Carbon Dioxide (CO₂)", percent: 70, color: "#E5A93C" },
      { name: "Carbon Monoxide (CO)", percent: 25, color: "#E05A47" },
      { name: "Nitrogen (N₂)", percent: 5, color: "#38B6BA" }
    ]
  },
  {
    id: "kepler16b",
    name: "Kepler-16b",
    hostStar: "Kepler-16 AB (Binary K-Dwarf & M-Dwarf)",
    type: "exotic",
    typeLabel: "Circumbinary Gas/Ice World",
    habitability: "extreme",
    habitabilityLabel: "Cold Gas Body / Outside HZ",
    distanceLy: 245,
    distancePc: 75,
    massEarth: 105.8,
    radiusEarth: 8.45,
    orbitalPeriodDays: 228.8,
    semiMajorAxisAu: 0.7048,
    surfaceTempK: 185,
    discoveryMethod: "Transit Photometry (Kepler)",
    discoveryYear: 2011,
    summary: "The definitive real-world 'Tatooine'. Kepler-16b orbits two mutual stars that eclipse each other every 41 days. It is a Saturn-mass frozen gas-ice world experiencing spectacular double sunsets every cycle.",
    colorPalette: ["#908471", "#595043", "#c4b69d", "#2e2920"],
    atmosphere: [
      { name: "Hydrogen (H₂)", percent: 75, color: "#38B6BA" },
      { name: "Helium (He)", percent: 22, color: "#E5A93C" },
      { name: "Methane (CH₄)", percent: 3, color: "#2EBA84" }
    ]
  },
  {
    id: "hd189733b",
    name: "HD 189733 b",
    hostStar: "HD 189733 (K1-V Orange Dwarf)",
    type: "gas-giant",
    typeLabel: "Hot Jupiter / Cobalt Atmosphere",
    habitability: "extreme",
    habitabilityLabel: "Violent Storms / Molten Glass Rain",
    distanceLy: 64.5,
    distancePc: 19.8,
    massEarth: 362.3,
    radiusEarth: 12.7,
    orbitalPeriodDays: 2.22,
    semiMajorAxisAu: 0.031,
    surfaceTempK: 1200,
    discoveryMethod: "Radial Velocity & Transit",
    discoveryYear: 2005,
    summary: "Appearing as a deceptive, serene deep cobalt blue, this gas giant's color is not oceans, but silicates condensing in the atmosphere into molten glass, carried sideways across the terminator by 8,700 km/h equatorial winds.",
    colorPalette: ["#164273", "#0b2545", "#377bb5", "#040f1c"],
    atmosphere: [
      { name: "Silicate Minerals (Glass)", percent: 45, color: "#38B6BA" },
      { name: "Hydrogen (H₂)", percent: 40, color: "#5680E9" },
      { name: "Sodium / Potassium", percent: 15, color: "#E5A93C" }
    ]
  },
  {
    id: "k218b",
    name: "K2-18b",
    hostStar: "K2-18 (M2.5V Red Dwarf)",
    type: "exotic",
    typeLabel: "Sub-Neptune / Hycean Candidate",
    habitability: "habitable",
    habitabilityLabel: "Potentially Habitable Ocean World",
    distanceLy: 124,
    distancePc: 38,
    massEarth: 8.63,
    radiusEarth: 2.61,
    orbitalPeriodDays: 32.94,
    semiMajorAxisAu: 0.159,
    surfaceTempK: 255,
    discoveryMethod: "Transit Photometry (K2 / Kepler)",
    discoveryYear: 2015,
    summary: "A sub-Neptune exoplanet orbiting within the habitable zone of red dwarf K2-18. JWST transmission spectra revealed abundant methane and carbon dioxide with a shortage of ammonia, consistent with a global water ocean beneath a hydrogen-rich atmosphere.",
    colorPalette: ["#2b5c5f", "#18383a", "#4ea1a6", "#0b1c1d"],
    atmosphere: [
      { name: "Methane (CH₄)", percent: 50, color: "#2EBA84" },
      { name: "Carbon Dioxide (CO₂)", percent: 35, color: "#E5A93C" },
      { name: "Hydrogen / Helium", percent: 15, color: "#38B6BA" }
    ]
  }
];

export const GALACTIC_ZONES = {
  core: {
    title: "Galactic Bulge & Central Bar",
    desc: "An intense, spheroidal concentration of roughly 10 billion older stars spanning ~10,000 light-years across. At its heart lies a boxy, peanut-shaped triaxial bar of metal-rich stars fueling gas inflows toward Sagittarius A*.",
    tags: [
      "Scale Height: ~1,500 ly",
      "Population: Pop II & Old Pop I",
      "Gas Content: High density CO & H I",
      "Radiation Field: Intense X-Ray & Gamma"
    ],
    density: "~100 stars / pc³",
    dominantClass: "K & M Giants"
  },
  thin: {
    title: "Thin Disc (Stellar Nursery & Spiral Arms)",
    desc: "The luminous disc containing ~85% of the galaxy's stars, gas, and dust. Spanning ~100,000 light-years with a thickness of only 1,000 light-years, this is the site of active star formation along density waves.",
    tags: [
      "Scale Height: ~1,000 ly",
      "Population: Young Population I",
      "Star Formation: 1.6 - 2.0 M☉ / year",
      "Spiral Arms: Perseus, Scutum-Centaurus, Sagittarius"
    ],
    density: "~0.1 stars / pc³",
    dominantClass: "O, B & A Main Sequence"
  },
  thick: {
    title: "Thick Disc (Ancient Intermediate Domain)",
    desc: "An older, vertically extended stellar disc discovered via spectroscopic velocity surveys. Composed of metal-poor stars formed during the turbulent early merger history of the proto-Milky Way 10–12 billion years ago.",
    tags: [
      "Scale Height: ~3,000 ly",
      "Population: Intermediate Pop II",
      "Metallicity: [Fe/H] ≈ -0.6",
      "Kinematics: High vertical dispersion"
    ],
    density: "~0.01 stars / pc³",
    dominantClass: "Subgiants & Old F/G Dwarfs"
  },
  halo: {
    title: "Stellar & Dark Matter Halo",
    desc: "A vast, diffuse spherical envelope extending outward to at least 650,000 light-years. While containing only ~1% of visible stellar mass in ancient globular clusters, it harbors the massive dark matter halo that stabilizes the galaxy.",
    tags: [
      "Extents: > 650,000 light-years",
      "Globular Clusters: 158 catalogued",
      "Dark Matter Fraction: ~88% of total mass",
      "Tidal Streams: Gaia-Enceladus remnants"
    ],
    density: "< 0.001 stars / pc³",
    dominantClass: "Extremely Metal-Poor Pop II"
  }
};
