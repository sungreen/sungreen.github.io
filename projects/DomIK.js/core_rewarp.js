import * as THREE from './vendor/three.module.min.js';
import * as DOMIK from './core_domik.js';

// warp

const options = {
    segments: 100,
    scale: 1,
    subdiv: 5,
    background: false,
    texture: "Image0"
}

const sources = {
    Image0: { texture:"./content/fisheye/Fisheye.jpg", video:false },
    Image1: { texture:"./content/fisheye/Dome.png", video:false },
    Video0: { texture:"./content/fisheye/RotateRedWire.mkv", video:true },
    Video1: { texture:"./content/fisheye/MoveTopRedWire.mkv", video:true },
    Video2: { texture:"./content/fisheye/MoveFrontRedWire.mkv", video:true },
    Video3: { texture:"./content/fisheye/Sea.mkv", video:true }
}

const controls = {
    texture: {}
}

export function init( app, folder ) {
    folder.add( options, 'background' );
    controls.texture = folder.add( options, 'texture', ["Image0", "Image1", "Video0", "Video1", "Video2", "Video3" ] ).onChange( value=> {presetOptions( null, value );} );
}

export function update( app ) {
    if (options.background) {
        controls.texture.show();
    } else {
        controls.texture.hide();
    }
}

export function refresh( app ) {
}

function copy_data( vs, offs, size, data) {
    for( let i=0; i<size; i++) {
        vs[offs+i] = data[i];
    }
    return offs + size;
}

var vertices;
var indices;
var uvs;
var offs_v = 0;
var offs_i = 0;
var offs_u = 0;

function make_data( v0, v1, v2, u0, u1, u2 ) {
    offs_i = copy_data( indices, offs_i, 3, [offs_v/3+0, offs_v/3+1, offs_v/3+2] );
    offs_v = copy_data( vertices, offs_v, 3, [v0.x, v0.y, v0.z] );
    offs_v = copy_data( vertices, offs_v, 3, [v1.x, v1.y, v1.z] );
    offs_v = copy_data( vertices, offs_v, 3, [v2.x, v2.y, v2.z] );
    offs_u = copy_data( uvs, offs_u, 2, [u0.x, u0.y] );
    offs_u = copy_data( uvs, offs_u, 2, [u1.x, u1.y] );
    offs_u = copy_data( uvs, offs_u, 2, [u2.x, u2.y] );
}

function onFisheyeUV( pointOnDome ) {
    const domik = DOMIK.get_options();
    const Rd = domik.dome.radius;
    const p = pointOnDome.clone().divideScalar( Rd );
    const r = Math.sqrt(p.x*p.x + p.z*p.z);
    const b = Math.atan2( p.y, r );
    const a = Math.atan2( p.x, p.z); // z<>x
    const pr = 1 - 2*b/Math.PI;
    const x = pr*Math.cos(a);
    const y = pr*Math.sin(a);
    return new THREE.Vector3( (x+1)/2, (y+1)/2, 0 );
}

function subtri( a, b, c, level, vertices, indices, uvs ) {
    if( level ){
        const ab = a.clone().lerp(b, 0.5);
        const r = a.length()+b.length();
        ab.normalize().multiplyScalar(r/2);
        const f = 0.5;
        const bc = b.clone().lerp(c,f);
        const ca = a.clone().lerp(c,f);
        subtri( a, ab, ca, level-1, vertices, indices, uvs );
        subtri( ab, b, bc, level-1, vertices, indices, uvs );
        subtri( ca, bc, c, level-1, vertices, indices, uvs );
        subtri( bc, ca, ab, level-1,vertices, indices, uvs );
    } else {
        const ma = DOMIK.onDome( a.x, a.y, a.z );
        const mb = DOMIK.onDome( b.x, b.y, b.z );
        const mc = DOMIK.onDome( c.x, c.y, c.z );
        if( ma!=null & mb!=null & mc!=null ) {
            const pa = onFisheyeUV( ma );
            const pb = onFisheyeUV( mb );
            const pc = onFisheyeUV( mc );
            make_data( a, b, c, pa, pb, pc, vertices, indices, uvs);
        }
    }
}

function make( app ) {
    const group = new THREE.Group();
    const a0 = new THREE.Vector3(  0.0, 0.0,-2.0 );
    const a1 = new THREE.Vector3(  0.0, 2.0, 0.0 );
    const a2 = new THREE.Vector3(  0.0, 0.0, 2.0 );
    const v0 = new THREE.Vector3(  0.0, 0.0, 0.0 );
    const level = 5;

    const size = 2*Math.pow(4, level);

    offs_i = 0;
    offs_v = 0;
    offs_u = 0;
    vertices = new Float32Array( size*9 )
    indices = new Uint32Array( size*3 );
    uvs = new Float32Array( size*6 );

    subtri( a0, a1, v0, level, vertices, indices, uvs );
    subtri( a1, a2, v0, level, vertices, indices, uvs );

    const source = sources[options.texture]
    const texture = source.texture
    const isVideo = source.video

    if ( isVideo ) {
        var video = document.getElementById( 'video' );
        video.src = texture;
        video.load();
        var promise = document.querySelector( 'video' ).play();

        if (promise !== undefined) {
            promise.then(_ => { video.play();}).catch( error => {});
        }
        video.addEventListener( 'play', function () { this.currentTime = 3; } );
        var uvTex = new THREE.VideoTexture( video );
        uvTex.colorSpace = THREE.SRGBColorSpace;
    } else {
        var uvTex = new THREE.TextureLoader().load( texture );
    }
    const material	= new THREE.MeshBasicMaterial( { map: uvTex, side: THREE.DoubleSide, } );
    const geometry	= new THREE.BufferGeometry();

    geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
    geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
    return new THREE.Mesh( geometry, material );
}

export function get_shape( app ) {
    const warp = make( app );
    warp.rotation.y = Math.PI/2;
    return warp;
}

export function get_options() {
    return options;
}
