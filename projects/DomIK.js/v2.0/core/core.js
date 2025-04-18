import { options } from './core_options.js'

import * as THREE from 'three';
import * as DOMIK from './core_domik.js'
import * as WARP_WIRE from './core_warp_wire.js'
import * as WARP_TEXTURE from './core_rewarp.js'
import * as GUI from './gui.js'

function getURLVarArr() {
    var data = [];
    var query = String(document.location.href).split('?');
    if (query[1]) {
      var part = query[1].split('&');
      for (i = 0; i < part.length; i++) {
        var dat = part[i].split('=');
        data[dat[0]] = dat[1];
      }
    }
    return data;
}

function updateSize() {
    if( options.renderer ) {
        const fullWidth = window.innerWidth;
        const fullHeight = window.innerHeight;
        const aspect = fullWidth / fullHeight;
        const virtWidth = fullWidth/aspect;
        options.camera.setViewOffset( virtWidth, fullHeight, (virtWidth-fullWidth)/2, 0, fullWidth, fullHeight );
        options.camera.updateProjectionMatrix();
        options.renderer.setSize( fullWidth, fullHeight );
    }
    update();
}

function update() {
    WARP_WIRE.update();
    WARP_TEXTURE.update();

    options.camera.position.z = 100;
    options.scene.remove( options.root );
    options.root = new THREE.Group();
    options.scene.add( options.root );

    if ( options.tools.showTexture ) {
        const warp = WARP_TEXTURE.get_shape( options );
        options.root.add( warp );
    }
    if ( options.tools.wireframe ) {
        const warp = WARP_WIRE.get_shape( options );
        options.root.add( warp );
    }
    options.need_update = false;

    document.documentElement.style.setProperty( "--tone", options.interface.tone );
    document.documentElement.style.setProperty( "--base-size", parseFloat( options.interface.size )+'vh' );
    document.documentElement.style.setProperty( "--font-family", options.interface.font );
}

function animate() {
    requestAnimationFrame( animate );
    if( options.need_update ) update();

    const s = 1 + 2.0 * ( options.screen.zenit - options.screen.front );
    const x = options.screen.side;
    const y = options.screen.front;

    if( options.uniforms ) {
        options.uniforms['time'].value = options.clock.getElapsedTime();
        options.uniforms['mouse'].value = options.mouse.value;
        options.uniforms['resolution'].value.x = options.renderer.domElement.width;
        options.uniforms['resolution'].value.y = options.renderer.domElement.height;
    }

    options.scene.scale.set( s, s, s );
    options.scene.position.x = x;
    options.scene.position.y = y;
    options.renderer.render( options.scene, options.camera );
}

function init() {
    WARP_TEXTURE.init();
    WARP_WIRE.init();

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera( -0.5, 0.5, 1, 0, 0.001, 1000 );
    const renderer = new THREE.WebGLRenderer();

    const container = document.createElement( 'div' );
    document.body.appendChild( container );
    container.style.position = 'fixed';
    container.style.display = 'flix';
    container.appendChild( renderer.domElement );
    document.body.scale = 1.0;

    options.clock = new THREE.Clock(true);
    options.root = new THREE.Group();
    options.camera = camera;
    options.renderer = renderer;
    options.scene = scene;
    options.mouse = { value: new THREE.Vector2() };
    scene.add( options.root );

    document.onmousemove = function( e ) {
        options.mouse.value.x = e.pageX / window.innerWidth;
        options.mouse.value.y = e.pageY / window.innerHeight;
    }

    window.addEventListener('resize', updateSize );
    updateSize();

    options.need_update = true;
    options.app.update = update;

    GUI.init();
}

function main() {
    init();
    animate();
}

main()