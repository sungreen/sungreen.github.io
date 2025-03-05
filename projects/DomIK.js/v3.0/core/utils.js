import * as THREE from 'three';

const { abs, min, max, round } = Math;

export const int2rgb = ( num ) => {
    const b = ( num & 0xFF );
    const g = ( num & 0xFF00 ) >>> 8;
    const r = ( num & 0xFF0000 ) >>> 16;
    const a = ( (num & 0xFF000000) >>> 24 ) / 255 ;
    return [ r, g, b, a];
}

export const rgb2int = ( r, g, b, a ) => ( a << 25 ) + ( r << 16 ) + ( g << 8 ) + ( b );

export const rgb2rgbtxt = ( r, g, b, a ) => 'rgb' + ( a ? 'a': '' ) + '(' + r + ',' + g + ',' + b + ( a ? ',' + a : '' ) + ')';

export const rgb2hex = (r, g, b) => ((r << 16) + (g << 8) + b).toString(16).padStart(6, '0');

export const hex2rgbtxt = hex => {
    let alpha = false,
    h = hex.slice(hex.startsWith('#') ? 1 : 0);
  if (h.length === 3) h = [...h].map(x => x + x).join('');
  else if (h.length === 8) alpha = true;
  h = parseInt(h, 16);
  return (
    'rgb' +
    (alpha ? 'a' : '') +
    '(' +
    (h >>> (alpha ? 24 : 16)) +
    ', ' +
    ((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)) +
    ', ' +
    ((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) +
    (alpha ? `, ${h & 0x000000ff}` : '') +
    ')'
  );
};

export function hsl2rgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [round(r * 255), round(g * 255), round(b * 255)];
}

export function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

export function rgb2hsl(r, g, b) {
    (r /= 255), (g /= 255), (b /= 255);
    const vmax = max(r, g, b), vmin = min(r, g, b);
    let h, s, l = (vmax + vmin) / 2;
  
    if (vmax === vmin) {
      return [0, 0, l]; // achromatic
    }
  
    const d = vmax - vmin;
    s = l > 0.5 ? d / (2 - vmax - vmin) : d / (vmax + vmin);
    if (vmax === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (vmax === g) h = (b - r) / d + 2;
    if (vmax === b) h = (r - g) / d + 4;
    h /= 6;
  
    return [h*360, s*100, l*100];
}


export const Tools3D = {
  report: ( obj, level=0 ) => {
    const list = [];
    if( obj.isGroup ) {
      list.push( `${obj.visible} ${ ('.').repeat( level ) } ${obj.name} [` );
      obj.children.forEach( ( child, index ) => {
        list.push( ...Tools3D.report( child, level+1 ) );
      } );
      list.push( `${ ('.').repeat( level ) } ${obj.name} ]` );
    } else {
      list.push( `${obj.visible} ${ ('.').repeat( level ) } ${obj.type} ${obj.name}` );
    }
    return list;
  },
  color: {
    Ramp: ( f, color0, color1 ) => { return ( color1 - color0 ) * f + color0; },
    Index: ( i, colors ) => { return colors[ i % colors.length ]; },
  },
 
  mesh: ( geometry=Tools3D.geometry.Plane(), material=Tools3D.material.Color() ) => {
    return new THREE.Mesh( geometry, material );
  },

  wire: ( geometry=Tools3D.geometry.Plane(), material=Tools3D.material.Color() ) => {
    return new THREE.LineSegments( new THREE.WireframeGeometry( geometry ), material );
  },

  material: {
    Color: ( color=0x55ff88 ) => { 
      return new THREE.MeshBasicMaterial( { color: 0x55ff88 } );
    },
    LineColor: ( color=0x55ff88 ) => { 
      return new THREE.LineBasicMaterial( { color: 0x55ff88, depthTest: false, opacity: 0.5, transparent: true } );
    }
  },

  geometry: {
    Box: ( w=1, h=1, d=0 ) => {
      return new THREE.BoxGeometry( w, h, d );
    },

    Plane: ( w=1, h=1 ) => {
      return new THREE.PlaneGeometry( w, h );
    },

    RectangleRounded: ( w=1, h=1, r=0.2, s=8 ) => {
      // https://discourse.threejs.org/t/roundedrectangle-squircle/28645
      // width, height, radiusCorner, smoothness
      const pi2 = Math.PI * 2;
      const n = ( s + 1 ) * 4; // number of segments
      let indices = [];
      let positions = [];
      let uvs = [];   
      let qu, sgx, sgy, x, y;
      for ( let j = 1; j < n + 1; j ++ ) indices.push( 0, j, j + 1 ); // 0 is center
      indices.push( 0, n, 1 );   
      positions.push( 0, 0, 0 ); // rectangle center
      uvs.push( 0.5, 0.5 );   
      for ( let j = 0; j < n ; j ++ ) contour( j );
      const geometry = new THREE.BufferGeometry( );
      geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( indices ), 1 ) );
      geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
      geometry.setAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( uvs ), 2 ) );
      return geometry;
    
      function contour( j ) {
        qu = Math.trunc( 4 * j / n ) + 1 ;      // quadrant  qu: 1..4
        sgx = ( qu === 1 || qu === 4 ? 1 : -1 ) // signum left/right
        sgy =  qu < 3 ? 1 : -1;                 // signum  top / bottom
        x = sgx * ( w / 2 - r ) + r * Math.cos( pi2 * ( j - qu + 1 ) / ( n - 4 ) ); // corner center + circle
        y = sgy * ( h / 2 - r ) + r * Math.sin( pi2 * ( j - qu + 1 ) / ( n - 4 ) );   
        positions.push( x, y, 0 );
        uvs.push( 0.5 + x / w, 0.5 + y / h );
      }
    },

    Rectangle: ( w=1, h=1, b=0 ) => {
      return new THREE.PlaneGeometry( w, h );
    },

    Circle: ( w=1, h=1, b=0 ) => {
      return new THREE.CircleGeometry( ( w>h? h: w ) / 2 );
    },

    Star: ( w=1, h=1, b=0 ) => {
      return new THREE.CircleGeometry( w>h? h: w );
    },

  }
}