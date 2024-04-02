import * as THREE from 'three';
import * as DOMIK from './core_domik.js';
import { options } from './core_options.js'

import defaultVertexShader from './shaders/DefaultVertexShader.glsl.js';
import equirectangularFragmentShader from './shaders/EquirectangularShader.glsl.js';
import fisheyeFragmentShader from './shaders/FisheyeShader.glsl.js';
import cubemapFragmentShader from './shaders/CubemapShader.glsl.js';
import cineramaFragmentShader from './shaders/CineramaShader.glsl.js';
import splashFragmentShader from './shaders/SplashShader.glsl.js';
import skinFragmentShader from './shaders/SkinShader.glsl.js';

options.tools.transformTypeList = [ 'Fisheye', 'Equirectangular', 'Cubemap', 'Cinerama' ];
options.tools.skins = [ 'cinerama', 'night_sky_0001', 'night_sky_0002', 'night_sky_0003', 'night_sky_0006', 'night_sky_0007', 'urban_0004', 'urban_0005' ];
options.tools.skin = null;
options.tools.showTexture = true;
options.tools.showGrid = true;
options.tools.transformType = null;
options.tools.level = 7;
options.tools.limit = 7;
options.tools.triCount = 0;
options.tools.limitEdge = 0;
options.tools.factor = 360;
options.tools.rotate = 0;

export function init( app, folder ) {}
export function update( app ) {}

let conv_func;
let conv_count;
let fragmentShader;
let vertexShader;
 
function add_tri_data( data, vs, uvs ) {
    const last = data.vs[0].length;
    for( let i=0; i<conv_count; i++ ) {
        data.vs[i].push( vs[0][i].x, vs[0][i].y, vs[0][i].z, vs[1][i].x, vs[1][i].y, vs[1][i].z, vs[2][i].x, vs[2][i].y, vs[2][i].z );
    }

    data.indices.push( last/3+0, last/3+1, last/3+2 );

    if( Math.abs(uvs[0].x-uvs[1].x)>0.9) {
        if( uvs[0].x==1 ) uvs[0].x=0;
        if( uvs[1].x==1 ) uvs[1].x=0;
    }

    if( Math.abs(uvs[1].x-uvs[2].x)>0.9) {
        if( uvs[1].x==1 ) uvs[1].x=0;
        if( uvs[2].x==1 ) uvs[2].x=0;
    }

    if( Math.abs(uvs[2].x-uvs[0].x)>0.9) {
        if( uvs[2].x==1 ) uvs[2].x=0;
        if( uvs[0].x==1 ) uvs[0].x=0;
    }

    data.uvs.push( uvs[0].x, uvs[0].y, uvs[1].x, uvs[1].y, uvs[2].x, uvs[2].y );
    const d0 = uvs[0].distanceTo( uvs[1] );
    const d1 = uvs[1].distanceTo( uvs[2] );
    const d2 = uvs[2].distanceTo( uvs[0] );
}

function subtri( data, va, vb, vc, level ) {
    let limit = options.tools.limitEdge;

    const ta = Array( conv_count+1 );
    const tb = Array( conv_count+1 );
    const tc = Array( conv_count+1 );

    ta[0] = va.clone();
    tb[0] = vb.clone();
    tc[0] = vc.clone();

    for( let i=0; i<conv_count; i++ ) {
        if( ta[i] ) ta[i+1] = conv_func[i]( ta[i] );
        if( tb[i] ) tb[i+1] = conv_func[i]( tb[i] );
        if( tc[i] ) tc[i+1] = conv_func[i]( tc[i] );
    }

    const a = ta[conv_count];
    const b = tb[conv_count];
    const c = tc[conv_count];

    let ab = ( a && b ) ? ( (a.distanceTo( b )<limit && a.z==b.z)? 2 : 1 ) : 0;
    let bc = ( b && c ) ? ( (b.distanceTo( c )<limit && b.z==c.z)? 2 : 1 ) : 0;
    let ca = ( c && a ) ? ( (c.distanceTo( a )<limit && c.z==a.z)? 2 : 1 ) : 0;

    if(( ab==2 && bc==2 && ca==2 ) || ( level==0 && ab*bc*ca!=0 )) {
        if( a.z==b.z && b.z==c.z ) {
            add_tri_data( data, [ ta, tb, tc ], [ a, b, c] );
        }
    } else {
        if( level ) {
            const ra = va.length()/2;
            const rb = vb.length()/2;
            const rc = vc.length()/2;
            ab = va.clone().lerp( vb, 0.5 ).normalize().multiplyScalar( ra+rb );
            bc = vb.clone().lerp( vc, 0.5 ).normalize().multiplyScalar( rb+rc );
            ca = vc.clone().lerp( va, 0.5 ).normalize().multiplyScalar( rc+ra );
            subtri( data, va, ab, ca, level-1 );
            subtri( data, vb, bc, ab, level-1 );
            subtri( data, vc, ca, bc, level-1 );
            subtri( data, ab, bc, ca, level-1 );
        }
    }
}

function converted( data ){
    const level = options.tools.level;
    options.tools.limitEdge = 1/Math.pow( 2, options.tools.limit )
    const a0 = new THREE.Vector3(  1.0, 0.0, 0.0 );
    const a1 = new THREE.Vector3(  0.0, 1.0, 0.0 );
    const a2 = new THREE.Vector3( -1.0, 0.0, 0.0 );
    const v0 = new THREE.Vector3(  0.0, 0.0, 0.0 );
    subtri( data, a0, a1, v0, level );
    subtri( data, a1, a2, v0, level );
}

function conv___Simple( vs ) {
    return [
        new THREE.Vector2( (vs[0].z+1)/2, vs[0].y ),
        new THREE.Vector2( (vs[1].z+1)/2, vs[1].y ),
        new THREE.Vector2( (vs[2].z+1)/2, vs[2].y )
    ]
}

function make( app ) {

    conv_func =  [ DOMIK.onDomeFromScreen, DOMIK.onUVFisheyeFromDome ];
    const data = { vs:[], indices:[], uvs:[] }
    conv_count = conv_func.length;
    for( let i=0; i<=conv_count; i++ ) data.vs.push([]);
    converted( data );
    options.tools.triCount = data.uvs.length;
    const vertices = new Float32Array( data.vs[0] );
    const indices =  new Uint32Array( data.indices );
    const uvs =  new Float32Array( data.uvs );
    let geometry = new THREE.BufferGeometry();
    geometry.setIndex( new THREE.BufferAttribute( indices, 1 ));
    geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ));
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ));


    const group = new THREE.Group();

    vertexShader = defaultVertexShader;

    if( options.tools.transformType ) {
        switch( options.tools.transformType ){
            case 'Fisheye': fragmentShader = fisheyeFragmentShader; break;
            case 'Equirectangular': fragmentShader = equirectangularFragmentShader; break;
            case 'Cubemap': fragmentShader = cubemapFragmentShader; break;
            case 'Cinerama': fragmentShader = cineramaFragmentShader; break;
        }
        if( !options.tools.skin ) options.tools.skin = options.tools.skins[0];
    } else {
        if( options.tools.skin ) {
            fragmentShader = skinFragmentShader;
        } else {
            fragmentShader = splashFragmentShader;
        }
    }

    if( options.content.data ) {
        if( options.content.type == 'video' ) {
            options.content.uvTex = new THREE.VideoTexture( options.content.data );
            options.content.uvTex.colorSpace = THREE.SRGBColorSpace;
        }
        if( options.content.type == 'image' ) {
            options.content.uvTex = new THREE.TextureLoader().load( options.content.data.currentSrc );
            options.content.uvTex.colorSpace = THREE.SRGBColorSpace;
        }
    }

    if( options.tools.skin ) {
        const skin_file = 'static/skins/'  + options.tools.skin + '.png';
        options.content.uvSkin = new THREE.TextureLoader().load( skin_file );
        options.content.uvSkin.colorSpace = THREE.SRGBColorSpace;
    }

    options.uniforms = {
        u_image: { type: 't', value: options.content.uvTex },
        u_skin: { type: 't', value: options.content.uvSkin },
        u_factor: { type: "f", value: options.tools.factor/360.0 },
        u_rotate: { type: "f", value: options.tools.rotate/180.0 },
        u_time : { type: "f", value: 0.0 },
        u_mouse: { type: "v2", value: new THREE.Vector2() },
        u_resolution: { type: "v2", value: new THREE.Vector2() }
    };

    const material = new THREE.ShaderMaterial( {
                    uniforms: options.uniforms,
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader,
                    defines: { PR: window.devicePixelRatio.toFixed(1) }
        } );

    if( options.tools.showTexture) {
        const mesh = new THREE.Mesh( geometry, material );
        group.add( mesh );
    }

    return group;

    //     const group = new THREE.Group();
    
    // let uvTex;
    // let uvSkin;
    
    
    // uvSkin = new THREE.TextureLoader().load( 'content/CinemaRoom/cinemaroom_basic.png' );
    // uvSkin.colorSpace = THREE.SRGBColorSpace;
    
    
    //         options.skin  = {
    //             // u_image: { type: 't', value: uvTex },
    //             // u_skin: { type: 't', value: uvSkin },
    //             // u_factor: { value: options.tools.factor },
    //             u_time : { value: 1.0 }
    //         };

    //         // options.skin=uniforms;

    //         let material = new THREE.ShaderMaterial( {
    //             uniforms: options.skin,
    //             vertexShader: vertexShader,
    //             fragmentShader: fragmentShader,
    //             defines: { PR: window.devicePixelRatio.toFixed(1) }
    //         } );

    //         if( options.tools.showTexture){
    //             const mesh = new THREE.Mesh( geometry, material );
    //             group.add( mesh );
    //         }
    //     }
    // }





    // if( content ) {
    //     if( content.type == 'video' ) {
    //         uvTex = new THREE.VideoTexture( content.data );
    //         uvTex.colorSpace = THREE.SRGBColorSpace;
    //     }
    //     if( content.type == 'image' ) {
    //         uvTex = new THREE.TextureLoader().load( content.data.currentSrc );
    //         uvTex.colorSpace = THREE.SRGBColorSpace;
    //     }

    //     if( uvTex ) {
    //         conv_func =  [ DOMIK.onDomeFromScreen, DOMIK.onUVFisheyeFromDome ];
    //         const data = { vs:[], indices:[], uvs:[] }
    //         conv_count = conv_func.length;
    //         for( let i=0; i<=conv_count; i++ ) data.vs.push([]);
    //         vertexShader = defaultVertexShader;
    //         switch( options.tools.transformType ){
    //             case 'Fisheye': fragmentShader = fisheyeFragmentShader; break;
    //             case 'Equirectangular': fragmentShader = equirectangularFragmentShader; break;
    //             case 'Cubemap': fragmentShader = cubemapFragmentShader; break;
    //             case 'Cinerama': fragmentShader = cineramaFragmentShader; break;
    //         }

    //         const error = converted( data );
    //         if( !error ) {
    //             options.tools.triCount = data.uvs.length;
    //             const vertices = new Float32Array( data.vs[0] );
    //             const indices =  new Uint32Array( data.indices );
    //             const uvs =  new Float32Array( data.uvs );
    //             let geometry = new THREE.BufferGeometry();
    //             geometry.setIndex( new THREE.BufferAttribute( indices, 1 ));
    //             geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ));
    //             geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ));

    //             options.skin  = {
    //                 // u_image: { type: 't', value: uvTex },
    //                 // u_skin: { type: 't', value: uvSkin },
    //                 // u_factor: { value: options.tools.factor },
    //                 u_time : { value: 1.0 }
    //             };

    //             // options.skin=uniforms;

    //             let material = new THREE.ShaderMaterial( {
    //                 uniforms: options.skin,
    //                 vertexShader: vertexShader,
    //                 fragmentShader: fragmentShader,
    //                 defines: { PR: window.devicePixelRatio.toFixed(1) }
    //             } );

    //             if( options.tools.showTexture){
    //                 const mesh = new THREE.Mesh( geometry, material );
    //                 group.add( mesh );
    //             }
    //         }
    //     }
    // }
}


export function get_shape( app ) {
    const warp = make( app );
    return warp;
}