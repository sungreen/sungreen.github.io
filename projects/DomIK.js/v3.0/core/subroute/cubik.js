import * as THREE from 'three';
import * as ROUTE from './subroute.js'
import * as DOMIK from '../domik.js'
import { unidome } from '../domik.js';

import defaultVertexShader from '../shaders/VertexShader.glsl.js';
import defaultFragmentShader from '../shaders/FragmentShader.glsl.js';
import { Tools3D } from '../utils.js';

const cube_camera_views = [
    { dir: [ -1,  0,  0], pos: [ 0, 1, 0], rot: 0 },
    { dir: [  0,  0, -1], pos: [ 1, 1, 0], rot: 0 },
    { dir: [  1,  0,  0], pos: [ 2, 1, 0], rot: 0 },
    { dir: [  0,  1,  0], pos: [ 2, 0, 0], rot: -Math.PI/2 },
    { dir: [  0,  0,  1], pos: [ 1, 0, 0], rot: Math.PI/2 },
    { dir: [  0, -1,  0], pos: [ 0, 0, 0], rot: -Math.PI/2 },
];


const clock = new THREE.Clock(true);
const sizeblock = 1024;
let root, warp;
let renderTarger;

const uniforms = {};

let app;

export function subroute() {
    const sub = ROUTE.route( 'cubik' );
    app = ROUTE.app;

    sub.registry( 'init', ( options ) => {
        cube_camera_views.forEach( ( view ) => {
            view.camera = new THREE.PerspectiveCamera( 90, 1, 0.001, 100 );
            view.camera.position.set( 0, 0, 0 );
            view.camera.lookAt( new THREE.Vector3().fromArray( view.dir ) );
            view.camera.rotateZ( view.rot );
        } );
        warp = new THREE.Group();
        renderTarger = new THREE.WebGLRenderTarget( sizeblock * 3, sizeblock * 2 );
    } );

    sub.registry( 'set_context', ( options ) => {
        if( options.root ) root = options.root;
        ROUTE.send( 'change_context', options );
    } );

    sub.registry( 'set_warp', ( options ) => {

        function set( key, value ) {
            if( !uniforms[key] ) uniforms[key] = value;
            if( options && options.hasOwnProperty( key ) ) uniforms[key].value = options[key];
        }

        DOMIK.calcDomik( app.dome, app.mirror, app.projector );
        let vertexShader = defaultVertexShader;
        let fragmentShader = defaultFragmentShader;

        uniforms.img_cube = { type: 't', value: renderTarger.texture };
        uniforms.tilt = { type: "f", value: app.options.tilt/180.0 };
        uniforms.flexture = { type: "f", value: app.options.flexture };
        uniforms.seamless = { type: "f", value: app.options.seamless };
        uniforms.time = { type: "f", value: 0.0 };
        uniforms.mouse = { type: "v2", value: new THREE.Vector2() };
        uniforms.resolution = { type: "v2", value: new THREE.Vector2() };
        uniforms.ud_mirror_radius = { type: "f", value: unidome.rm };
        uniforms.ud_shift = { type: "v3", value: unidome.shift };
        uniforms.ud_factor = { type: "f", value: unidome.factor };
        uniforms.ud_dome = { type: "v3", value: unidome.dome };
        uniforms.ud_mirror = { type: "v3", value: unidome.mirror };
        uniforms.ud_projector = { type: "v3", value: unidome.projector };
        uniforms.ud_base = { type: "f", value: unidome.base };
        uniforms.ud_sour = { type: "v3", value: new THREE.Vector3( app.transform.sour_width, app.transform.sour_height, app.transform.sour_shift ) };
        uniforms.ud_dest = { type: "v3", value: new THREE.Vector3( app.transform.dest_width, app.transform.dest_height, app.transform.dest_shift ) };

        if( options.shader ) {
            const fs = defaultFragmentShader.split('#define easy_block');
            fragmentShader = fs[0] + options.shader + fs[2];
        } else {
            if( !fragmentShader ) fragmentShader = defaultFragmentShader;
        }

        set( 'img_dome', { type: 't', value: null } );
        set( 'scope_dome', { type: "f", value: 1.0 } );
        set( 'rotate_dome', { type: "f", value: 0.0 } );
        set( 'scope_cube', { type: "f", value: 1.0 } );
        set( 'rotate_cube', { type: "f", value: 0.0 } );

        set( 'stype', { type: "f", value: 0.0 } );
        set( 'dtype', { type: "f", value: 0.0 } );

        console.log( 'cubik', uniforms );

        const geometry = new THREE.PlaneGeometry( 1, 1 );
        const warpMat = new THREE.ShaderMaterial( {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            defines: { PR: window.devicePixelRatio.toFixed(1) },
            transparent: true
        } );

        warp.clear();
        warp.add( new THREE.Mesh( geometry, warpMat ) );

        ROUTE.send( 'set_warp_param', { warp: warp } );
    } );
}

export function modify() {
    if( uniforms.time ) {
        const s = 1 + 2.0 * ( app.screen.zenit - app.screen.front );
        const x = app.screen.side;
        const y = app.screen.front;

        uniforms['time'].value = clock.getElapsedTime();
        uniforms['mouse'].value = app.mouse.value;
        uniforms['resolution'].value.x = app.renderer.domElement.width;
        uniforms['resolution'].value.y = app.renderer.domElement.height;

        const pixelRatio = devicePixelRatio;
        app.renderer.setRenderTarget( null );
        app.renderer.autoClear = true;
        app.renderer.clear();
        app.renderer.setPixelRatio( pixelRatio );
        app.renderer.setRenderTarget( renderTarger );

        if( root ) {
            for( const view of cube_camera_views ) {
                const left = sizeblock * view.pos[0] / pixelRatio;
                const bottom = sizeblock * view.pos[1] / pixelRatio;
                const width = sizeblock  / pixelRatio;
                const height = sizeblock  / pixelRatio;
                app.renderer.setViewport( left, bottom, width, height );
                app.renderer.setScissor( left, bottom, width, height );
                app.renderer.setScissorTest( true );
                view.camera.position.set( 0, app.options.overhead, 0 );
                view.camera.aspect = width / height;
                view.camera.updateProjectionMatrix();
                app.renderer.render( root, view.camera );
            }
        }
    }
}