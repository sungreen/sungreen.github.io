import * as THREE from './vendor/three.module.min.js';
import GUI  from './vendor/lil-gui.module.min.js';

// DOMIK

const domik_options = {
    dome: { radius: 2.5 },
    mirror: { radius: 0.25, offset: 0.0, elevation: 0.0 },
    projector: { offset: 0.5, elevation: 0.0 },
    screen: { scale:1, vert:0, horz:0 }
}

function vec3( x=0, y=0, z=0 ) { return new THREE.Vector3( x, y, z ); }
function vec3sub( v0, v1 ) { return vec3().copy(v0).sub(v1); }
function vec3add( v0, v1 ) { return vec3().copy(v0).add(v1); }
function vec3mulf( v0, f ) { return vec3().copy(v0).multiplyScalar(f); }
function vec3mix( v0, v1, f ) { return vec3add(vec3mulf(v0,f),vec3mulf(v1,1-f)); }

function calcDomik( domik ){
    domik.dome.position = vec3( 0, 0, 0 );
    domik.mirror.position = vec3( domik.dome.radius+domik.mirror.offset, domik.mirror.elevation, 0 );
    domik.projector.position = vec3( domik.dome.radius+domik.mirror.offset-domik.mirror.radius-domik.projector.offset, domik.mirror.elevation+domik.projector.elevation, 0 );

    const Rm = domik.mirror.radius;
    const Rd = domik.dome.radius;

    const M = vec3sub( domik.mirror.position, domik.projector.position );
    const base = M.x;
    const Mb = vec3sub( onMirrorReflect( domik, vec3(-Rd, 0, 0) ), domik.projector.position );
    const Mz = vec3sub( onMirrorReflect( domik, vec3( 0, Rd, 0) ), domik.projector.position );
    const Pb = vec3mulf( Mb, base/Mb.x );
    const Pz = vec3mulf( Mz, base/Mz.x );

    domik.wrap = {
        shift: vec3( 0, Pb.y, 0 ),
        factor: 1/(Pz.y-Pb.y),
        base: M.x,
        maxray: 1000
    }
}

function angleTest( domik, dd, pp, mm ) {
    const rd = vec3sub( dd, mm );
    const rp = vec3sub( pp, mm );
    const rm = vec3sub( mm, domik.mirror.position) ;
    const ad = 180*rm.angleTo(rd)/Math.PI;
    const ap = 180*rm.angleTo(rp)/Math.PI;
    return Math.abs(ad - ap);
}

function onMirror( domik, v ) {
    const mp = domik.mirror.position;
    const mr = domik.mirror.radius;
	return vec3add( vec3mulf( vec3sub( v, mp ).normalize(), mr), mp ) ;
}

function onMirrorReflect( domik, dd ) {
    const pp = domik.projector.position;
    let dm = onMirror(domik, dd);
    let pm = onMirror(domik, pp);
    let limit = 50;
    while(limit) {
        const pd = vec3sub( dm, pm );
        const mm_0 = onMirror(domik, vec3add( vec3mulf( pd, 1/3), pm ));
        const mm_1 = onMirror(domik, vec3add( vec3mulf( pd, 2/3), pm ));
        const ts_0 = angleTest(domik, dd, pp, mm_0);
        const ts_1 = angleTest(domik, dd, pp, mm_1);
        if (ts_0<ts_1) {
            dm.copy(mm_1);
        } else {
            pm.copy(mm_0);
        }
        var mm = vec3mix( mm_0, mm_1, 1/2 );
        limit--;
    }
    return onMirror( domik,mm );
}

function onProjector( domik, dd ) {
    const maxray = domik.wrap.maxray;
    const pp = domik.projector.position;
    const pr = onMirrorReflect(domik, dd);
    const rayDist = pr.distanceTo(pp);
    if (rayDist>maxray) return null;
    const fp = vec3sub( pr, domik.projector.position );
    const fw = vec3mulf( fp,  domik.wrap.base/fp.x );
    const ps = vec3mulf( vec3sub( fw, domik.wrap.shift ), domik.wrap.factor );
	return ps;
}

// WRAP

const wrap_options = {
    segment_count: 13,
    scale: 1,
    subdiv: 5
}

function addPoint( points, point ) { if(point===null) {} else { points.push(point); } }

function makeWrap( app ) {
    const domik = app.domik;
    const wrap = app.wrap;

    const points = [];

    const segment = wrap.segment_count;
    const scale = wrap.scale;
    const subdiv = wrap.subdiv;

    const ring_count = segment;
    const segment_count = ring_count*4;
    const r = domik.dome.radius;
    const group = new THREE.Group();

    {
    let da = 2.0*Math.PI/(segment_count*subdiv);
    let db = 0.5*Math.PI/ring_count;
    for (let j=0; j<=ring_count; j++){
        let points = [];
            for (let i=0; i<(segment_count*subdiv); i++){
                let b = db*j;
                let a = da*i;
                let y = r * Math.cos(b);
                let x = r * Math.sin(b) * Math.cos(a);
                let z = r * Math.sin(b) * Math.sin(a);
                let point = onProjector(domik, vec3(x,y,z) );
                addPoint( points, point );
            }
            const mat = new THREE.LineBasicMaterial( { color: 0x00ff00, linewidth: 1 } );
            const geo = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.LineLoop( geo, mat );
            group.add( line );
        }
    }
    {
        let db = 2.0*Math.PI/(segment_count);
        let da = 0.5*Math.PI/(ring_count*subdiv-1);
        for (let j=0; j<segment_count; j++){
            let points = [];
            for (let i=2*subdiv; i<(ring_count*subdiv); i++){
                let b = db*j;
                let a = da*i;
                let y = r * Math.cos(a);
                let x = r * Math.sin(a) * Math.cos(b);
                let z = r * Math.sin(a) * Math.sin(b);
                let point = onProjector(domik, vec3(x,y,z) );
                addPoint( points, point );
            }
            const mat = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
            const geo = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.Line( geo, mat );
            group.add( line );
        }
    }
    {
        let db = Math.PI/2;
        let da = 0.5*Math.PI/(ring_count*subdiv-1);
        for (let j=0; j<4; j++){
            let points = [];
            for (let i=0; i<(ring_count*subdiv); i++){
                let b = db*j;
                let a = da*i;
                let y = r * Math.cos(a);
                let x = r * Math.sin(a) * Math.cos(b);
                let z = r * Math.sin(a) * Math.sin(b);
                let point = onProjector(domik, vec3(x,y,z) );
                addPoint( points, point );
            }
            const mat = new THREE.LineBasicMaterial( { color: 0xff0000 } );
            const geo = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.Line( geo, mat );
            group.add( line );
        }
    }
    return group;
}

// GUI

const app_options = {
    name: "DomIK.JS",
    version: "1.05",
    reload: function() { window.location.reload(); },
    about: function() { const app = app_options; alert(app.name+" ("+app.version+")"); },
    preset: "Custom",
    domik: domik_options,
    wrap: wrap_options
}

function updateOptions( event ) {
    const app = app_options;
    updateScene( app );
}

function presetOptions( value ) {
    presetApp( value );
}

function initGUI( app ) {
    const domik = app.domik;

    const gui = new GUI();
    gui.title( app.name )
    gui.onChange( event => {updateOptions( event );} );

    const fol0 = gui.addFolder( 'Setup' );
    fol0.add( app, 'preset', ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"] ).onChange( value=> {presetOptions( value );} );

    const fol1 = fol0.addFolder( 'Dome' );
    fol1.add( domik.dome, 'radius', 2, 5, 0.1 );

    const fol2 = fol0.addFolder( 'Mirror' );
    fol2.add( domik.mirror, 'radius', 0.1, 0.5, 0.01 );
    fol2.add( domik.mirror, 'offset', -1, 1, 0.01 );
    fol2.add( domik.mirror, 'elevation', -1, 1, 0.01 );

    const fol3 = fol0.addFolder( 'Projector' );
    fol3.add( domik.projector, 'offset', 0.1, 1, 0.01 );
    fol3.add( domik.projector, 'elevation', -1, 1, 0.01 );

    const fol4 = gui.addFolder( 'Screen' );
    fol4.add( domik.screen, 'scale', 0.1, 10, 0.01 );
    fol4.add( domik.screen, 'vert', -1.0, 1.0, 0.01 );
    fol4.add( domik.screen, 'horz', -1.0, 1.0, 0.01 );

    const fol5 = gui.addFolder( 'Tools' );
    fol5.add( app, 'reload' ).name("Reload page");
    fol5.add( app, 'about' ).name("About");

    app.gui = gui;
}

function updateDisplay( gui ) {
    for (let i in gui.controllers) {
        gui.controllers[i].updateDisplay();
    }
    for (let f in gui.folders) {
        updateDisplay(gui.folders[f]);
    }
}

function updateGUI( app ) {
    updateDisplay( app.gui );
    if( app.preset=="Custom" ) {
        app.gui.fol1.show();
        app.gui.fol2.show();
        app.gui.fol3.show();
    } else {
        app.gui.fol1.hide();
        app.gui.fol2.hide();
        app.gui.fol3.hide();
    }
}

// APP

function presetApp( preset ) {
    const app = app_options;
    if( preset == "Dome 2.5 Mirror 0.25" ) {
        app.domik.dome.radius = 2.5;
        app.domik.mirror.radius = 0.25;
        app.domik.projector.offset = 0.5;
        app.domik.screen.scale = 1.17;
    }
    if( preset == "Dome 5.0 Mirror 0.37" ) {
        app.domik.dome.radius = 5.0;
        app.domik.mirror.radius = 0.37;
        app.domik.projector.offset = 0.6;
        app.domik.screen.scale = 1.17;
    }
    if( preset == "Expert" ) {
        app.domik.dome.radius = 100.0;
        app.domik.mirror.radius = 0.01;
        app.domik.projector.offset = 1.0;
        app.domik.screen.scale = 1.17;
    }
	updateScene( app );
	updateGUI( app );
}

function initScene( app ) {

    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const size = 2;
    const width = size*aspect;
    const height = size;

    const camera = new THREE.OrthographicCamera( -width/2, width/2, height, 0, 0.001, 1000 );
    const render = new THREE.WebGLRenderer();
    render.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( render.domElement );

    app.scene = scene;
    app.camera = camera;
    app.render = render;
}

function renderScene( app ) {
    app.render.render( app.scene, app.camera );
}

function updateScene( app ) {
    calcDomik(app.domik);
    while(app.scene.children.length > 0){ 
        app.scene.remove(app.scene.children[0]); 
    }
    const wrap = makeWrap( app );
    wrap.rotation.y = Math.PI/2;
    app.camera.position.z = 100;
    app.scene.add( wrap );
    app.root = wrap;
    renderScene( app );
}

function animate() {
    requestAnimationFrame( animate );
    const app = app_options;
    app.root.scale.set( 0, app.domik.screen.scale, app.domik.screen.scale );
    app.root.position.x = app.domik.screen.horz;
    app.root.position.y = app.domik.screen.vert;
    renderScene( app );
}

function main() {
    const app = app_options;
    initScene( app );
    initGUI( app );
    updateScene( app );
    animate();
}

main()