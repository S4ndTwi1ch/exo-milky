/**
 * ASTROMETRIC COORDINATE TRANSFORMS
 * Equatorial (RA/Dec) <-> Galactic (l/b) conversions
 * Reference: IAU 1958 standard galactic coordinate system
 * North Galactic Pole (NGP): RA = 192.859508 deg, Dec = 27.128336 deg
 * Galactic Center (Sgr A*): RA = 266.4051 deg, Dec = -29.0078 deg, l = 0, b = 0
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const GNP_RA  = 192.859508 * DEG; // 12h 51m 26.28s
const GNP_DEC =  27.128336 * DEG; // +27 deg 07' 42.0"
const L_NCP   = 122.932    * DEG;

export function equatorialToGalactic(raDeg, decDeg) {
  const ra  = raDeg  * DEG;
  const dec = decDeg * DEG;

  const sinB = Math.sin(dec) * Math.sin(GNP_DEC) +
               Math.cos(dec) * Math.cos(GNP_DEC) * Math.cos(ra - GNP_RA);
  const b = Math.asin(Math.max(-1, Math.min(1, sinB)));

  const y = Math.cos(dec) * Math.sin(ra - GNP_RA);
  const x = Math.sin(dec) * Math.cos(GNP_DEC) -
            Math.cos(dec) * Math.sin(GNP_DEC) * Math.cos(ra - GNP_RA);

  let l = L_NCP - Math.atan2(y, x);
  if (l < 0) l += Math.PI * 2;
  l = l % (Math.PI * 2);

  return { l: l * RAD, b: b * RAD };
}

export function galacticToEquatorial(lDeg, bDeg) {
  const l = lDeg * DEG;
  const b = bDeg * DEG;

  const sinDec = Math.sin(b) * Math.sin(GNP_DEC) +
                 Math.cos(b) * Math.cos(GNP_DEC) * Math.cos(L_NCP - l);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const y = Math.cos(b) * Math.sin(L_NCP - l);
  const x = Math.sin(b) * Math.cos(GNP_DEC) -
            Math.cos(b) * Math.sin(GNP_DEC) * Math.cos(L_NCP - l);

  let ra = GNP_RA + Math.atan2(y, x);
  if (ra < 0) ra += Math.PI * 2;
  ra = ra % (Math.PI * 2);

  return { ra: ra * RAD, dec: dec * RAD };
}

export function galacticToSunOffset(lDeg, bDeg, distanceLy) {
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  const dx = distanceLy * Math.cos(b) * Math.cos(l);
  const dy = distanceLy * Math.sin(b);
  const dz = distanceLy * Math.cos(b) * Math.sin(l);
  return { x: dx, y: dy, z: dz };
}

export function formatGalacticCoords(lDeg, bDeg) {
  const lNorm = ((lDeg % 360) + 360) % 360;
  const lStr = lNorm.toFixed(2);
  const bSign = bDeg >= 0 ? '+' : '−';
  const bStr = Math.abs(bDeg).toFixed(2);
  return `l = ${lStr}°, b = ${bSign}${bStr}°`;
}

export function formatRaDec(raDeg, decDeg) {
  const raHours = ((raDeg % 360) + 360) % 360 / 15;
  const rh = Math.floor(raHours);
  const rm = Math.floor((raHours - rh) * 60);
  const rs = (((raHours - rh) * 60 - rm) * 60).toFixed(1);

  const decSign = decDeg >= 0 ? '+' : '−';
  const absDec = Math.abs(decDeg);
  const dd = Math.floor(absDec);
  const dm = Math.floor((absDec - dd) * 60);
  const ds = (((absDec - dd) * 60 - dm) * 60).toFixed(0);

  return `RA ${rh}ʰ ${rm}ᵐ ${rs}ˢ · DEC ${decSign}${dd}° ${dm}′ ${ds}″`;
}
