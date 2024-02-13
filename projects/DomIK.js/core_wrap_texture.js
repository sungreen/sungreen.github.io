import * as THREE from './vendor/three.module.min.js';
import * as DOMIK from './core_domik.js';

// WRAP

const sources = {
    Image0: { texture:"./content/fisheye/Fisheye.jpg", video:false },
    Image1: { texture:"./content/fisheye/Dome.png", video:false },
    Video0: { texture:"./content/fisheye/RotateRedWire.mkv", video:true },
    Video1: { texture:"./content/fisheye/MoveTopRedWire.mkv", video:true },
    Video2: { texture:"./content/fisheye/MoveFrontRedWire.mkv", video:true },
    Video3: { texture:"./content/fisheye/Sea.mkv", video:true }
}

const wrap_options = {
    segment_count: 100,
    scale: 1,
    subdiv: 5,
    mode: "Image0"
}

function copy_data( vs, offs, size, data) {
    for( let i=0; i<size; i++) {
        vs[offs+i] = data[i];
    }
    return offs + size;
}

function make( rows, cols, vertices, indices, uvs ) {
    
    var offs_v = 0;
    var offs_i = 0;
    var offs_u = 0;
    const da = 2.0*Math.PI/cols;
    const db = 0.5*Math.PI/rows;
    const ds = 1/rows;
    const rd = DOMIK.get_options().dome.radius;

    for ( let row=0; row<rows; row++ ) {

        const b0 = db*row;
        const b1 = db*(row+1);
        const s0 = 1-ds*(row+0);
        const s1 = 1-ds*(row+1);
    
        const y0 = Math.sin(b0);
        const y1 = Math.sin(b1);
        const r0 = Math.cos(b0);
        const r1 = Math.cos(b1);

        for ( let col=0; col<cols; col++ ) {
            const a0 = da*col;
            const a1 = a0 + da;
            const x00 = r0*Math.sin( a0 );
            const z00 = r0*Math.cos( a0 );
            const x01 = r0*Math.sin( a1 );
            const z01 = r0*Math.cos( a1 );
            const x10 = r1*Math.sin( a0 );
            const z10 = r1*Math.cos( a0 );
            const x11 = r1*Math.sin( a1 );
            const z11 = r1*Math.cos( a1 );

            const v0 = DOMIK.onProjector( rd*x00, rd*y0, -rd*z00 );
            const v1 = DOMIK.onProjector( rd*x01, rd*y0, -rd*z01 );
            const v2 = DOMIK.onProjector( rd*x11, rd*y1, -rd*z11 );
            const v3 = DOMIK.onProjector( rd*x10, rd*y1, -rd*z10 );

            offs_i = copy_data( indices, offs_i, 3, [offs_v/3+0, offs_v/3+1, offs_v/3+2] );
            offs_i = copy_data( indices, offs_i, 3, [offs_v/3+2, offs_v/3+3, offs_v/3+0] );

            offs_v = copy_data( vertices, offs_v, 3, [v0.x, v0.y, v0.z] );
            offs_v = copy_data( vertices, offs_v, 3, [v1.x, v1.y, v1.z] );
            offs_v = copy_data( vertices, offs_v, 3, [v2.x, v2.y, v2.z] );
            offs_v = copy_data( vertices, offs_v, 3, [v3.x, v3.y, v3.z] );

            const u00 = (s0*Math.sin(a0 - Math.PI/2)+1)/2;
            const v00 = (s0*Math.cos(a0 - Math.PI/2)+1)/2;
            const u01 = (s0*Math.sin(a1 - Math.PI/2)+1)/2;
            const v01 = (s0*Math.cos(a1 - Math.PI/2)+1)/2;
            const u10 = (s1*Math.sin(a0 - Math.PI/2)+1)/2;
            const v10 = (s1*Math.cos(a0 - Math.PI/2)+1)/2;
            const u11 = (s1*Math.sin(a1 - Math.PI/2)+1)/2;
            const v11 = (s1*Math.cos(a1 - Math.PI/2)+1)/2;

            offs_u = copy_data( uvs, offs_u, 2, [u00, v00] );
            offs_u = copy_data( uvs, offs_u, 2, [u01, v01] );
            offs_u = copy_data( uvs, offs_u, 2, [u11, v11] );
            offs_u = copy_data( uvs, offs_u, 2, [u10, v10] );
        }
    }
}

export function get_root( app ) {
    const source = sources[wrap_options.mode]
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

    const rows = wrap_options.segment_count;
    const cols = wrap_options.segment_count;
    
    const vertices = new Float32Array( rows*cols*12 )
    const indices = new Uint32Array( rows*cols*6 );
    const uvs = new Float32Array( rows*cols*8 );

    make( rows, cols, vertices, indices, uvs );

    geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
    geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
    const mesh = new THREE.Mesh( geometry, material );

    return mesh;
}

export function get_options() {
    return wrap_options;
}