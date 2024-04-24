import * as THREE from 'three';
import * as DOMIK from './core_domik.js'

import { options } from './core_options.js'
import { exdata } from './core_options.js'

import { codeMaptexture } from  './core_options.js'
import { unidome } from './core_domik.js';

import defaultVertexShader from './shaders/VertexShader.glsl.js';
import defaultFragmentShader from './shaders/FragmentShader.glsl.js';
import defaultSpaceShader from './shaders/SpaceShader.glsl.js';

export function init( app, folder ) {}
export function update( app ) {}

let fragmentShader;
let vertexShader;
 
function make( app ) {

    DOMIK.calcDomik( options.dome, options.mirror, options.projector );

    const vertices = [ -1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  1.0,  0.0, -1.0,  1.0,  0.0 ];
    const indices = [ 0, 1, 2,  2, 3, 0 ];
    const uvs = [ 0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0 ];
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex( indices );
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
    const group = new THREE.Group();

    vertexShader = defaultVertexShader;
    fragmentShader = defaultFragmentShader;

    options.tools.transformTypeCode = codeMaptexture( options.tools.transformType );
    if( options.tools.transformTypeCode ) {
        if( exdata.data ) {
            if( exdata.type == 'video' ) {
                exdata.uvTex = new THREE.VideoTexture( exdata.data );
                exdata.uvTex.colorSpace = THREE.LinearSRGBColorSpace;
            }
            if( exdata.type == 'image' ) {
                exdata.uvTex = new THREE.TextureLoader().load( exdata.data.currentSrc );
                exdata.uvTex.colorSpace = THREE.LinearSRGBColorSpace;
            }
        }
    }

    if( !options.tools.transformTypeCode || options.tools.transformTypeCode==5 ) {
        const p = options.interface.skin.split('@');
        if( p[0]=='glsl' ) {
            const num = Number( p[1] );
            const ss = defaultSpaceShader.split('#define easy_block');
            const fs = defaultFragmentShader.split('#define easy_block');
            const spaceShaderNum = 1;
            fragmentShader = fs[0]+ss[num]+fs[2];
        } else {
            const skin_file = 'static/skins/'  + p[0] + '.png';
            exdata.uvSkin = new THREE.TextureLoader().load( skin_file );
            exdata.uvSkin.colorSpace = THREE.LinearSRGBColorSpace;
        }
    }

    options.uniforms = {
        image: { type: 't', value: exdata.uvTex },
        skin: { type: 't', value: exdata.uvSkin },
        factor: { type: "f", value: options.tools.factor/50.0 },
        rotate: { type: "f", value: options.tools.rotate/180.0 },
        flexture: { type: "f", value: options.tools.flexture },
        seamless: { type: "f", value: options.tools.seamless },

        time : { type: "f", value: 0.0 },
        mouse: { type: "v2", value: new THREE.Vector2() },
        resolution: { type: "v2", value: new THREE.Vector2() },
        transform: { type: "f", value: options.tools.transformTypeCode },

        ud_rm: { type: "f", value: unidome.rm },
        ud_shift: { type: "v3", value: unidome.shift },
        ud_factor: { type: "f", value: unidome.factor },
        ud_dome: { type: "v3", value: unidome.dome },
        ud_mirror: { type: "v3", value: unidome.mirror },
        ud_projector: { type: "v3", value: unidome.projector },
        ud_base: { type: "f", value: unidome.base }
    };

    const mat_warp = new THREE.ShaderMaterial( {
        uniforms: options.uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        defines: { PR: window.devicePixelRatio.toFixed(1) },
        transparent: true
    } );

    let materials;

    if( options.tools.transformTypeCode==0 || options.tools.transformTypeCode==5 ) {
        geometry.addGroup( 0, 6, 0 );
        geometry.addGroup( 0, 6, 1 );
        materials = [ mat_warp ];
    } else {
        materials = mat_warp;
    }

    if( options.tools.showTexture) {
        const mesh = new THREE.Mesh( geometry, materials );
        group.add( mesh );
    }
    return group;
}

export function get_shape( app ) {
    const warp = make( app );
    return warp;
}