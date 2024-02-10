import * as THREE from './libs/three.module.min.js';
import GUI  from './libs/lil-gui.module.min.js';

const domik_js_version = (1.01);

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const size = 2;
const width = size*aspect;
const height = size;
const offsetx =  0;
const offsety =  0;
const camera = new THREE.OrthographicCamera( -width/2+offsetx, width/2+offsetx, height/2+offsety, -height/2+offsety, 0.001, 1000 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const domik = {
	dome: { radius: 2.5, fix: false },
	mirror: { radius: 0.25, offset: 0.0, elevation: 0.0 },
	projector: { offset: -0.8, elevation: 0.0 },
	screen: { scale:1, vert:0, horz:0, mode: "" },
}

const options = {
	email: function() {
		var sub = "Support DomIK.js";
		var body = "Nikolay, need support DomIK.js. ";
		window.location.assign("mailto:nik4email@ya.ru?Subject="+sub+"&body="+body);
	},
	reload: function() {
		window.location.reload();
	},
	about: function() {
		alert("DomIK Calibration "+domik_js_version);
	},
	preset: "Custom" 
}

const gui = new GUI();

gui.title("DomIK Calibration")
gui.onChange( event => {updateOptions( event );} );

gui.add( options, 'preset', ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"] ).onChange( value=> {presetOptions( value );} );

const fol1 = gui.addFolder( 'Dome' );
fol1.add( domik.dome, 'radius', 2, 5, 0.1 );
fol1.add( domik.dome, 'fix');

const fol2 = gui.addFolder( 'Mirror' );
fol2.add( domik.mirror, 'radius', 0.1, 0.5, 0.01 );
fol2.add( domik.mirror, 'offset', -1, 1, 0.01 );
fol2.add( domik.mirror, 'elevation', -1, 1, 0.01 );

const fol3 = gui.addFolder( 'Projector' );
fol3.add( domik.projector, 'offset', -1, 1, 0.01 );
fol3.add( domik.projector, 'elevation', -1, 1, 0.01 );

const fol4 = gui.addFolder( 'Screen' );
fol4.add( domik.screen, 'scale', 0.1, 10, 0.01 );
fol4.add( domik.screen, 'vert', -1.0, 1.0, 0.01 );
fol4.add( domik.screen, 'horz', -1.0, 1.0, 0.01 );

const fol5 = gui.addFolder( 'Tools' );
fol5.add( options, 'reload' ).name("Reload page");
fol5.add( options, 'about' ).name("About");
//fol5.add( options, 'email' ).name("Send email");


function updateDisplay(gui) {
	for (var i in gui.controllers) {
		gui.controllers[i].updateDisplay();
	}
	for (var f in gui.folders) {
		updateDisplay(gui.folders[f]);
	}
}

function presetOptions( value ) {
	if( value == "Dome 2.5 Mirror 0.25" ) {
		domik.dome.radius = 2.5;
		domik.mirror.radius = 0.25;
		domik.projector.offset = -0.8;
	}
	if( value == "Dome 5.0 Mirror 0.37" ) {
		domik.dome.radius = 5.0;
		domik.mirror.radius = 0.37;
		domik.projector.offset = -0.8;
	}
	if( value == "Expert" ) {
		domik.dome.radius = 100.0;
		domik.mirror.radius = 0.01;
		domik.projector.offset = -0.8;
	}
	if( value == "Custom" ) {
	}
	updateScene();
	updateDisplay(gui);
}

function updateOptions( event ) {
	updateScene();
}

function updateScene() {
	calcDomik(domik);
	while(scene.children.length > 0){ 
		scene.remove(scene.children[0]); 
	}
	wrap = makeWrap(domik);
	wrap.rotation.y = Math.PI/2;
	scene.add( wrap );
	renderer.render( scene, camera );
}

var wrap = null;
updateScene();

camera.position.z = 100;

function vec3( x=0, y=0, z=0 ) {
	return new THREE.Vector3( x, y, z );
}

function vec3sub( v0, v1 ) {
	return vec3().copy(v0).sub(v1);
}

function vec3add( v0, v1 ) {
	return vec3().copy(v0).add(v1);
}

function calcDomik( domik ){
	domik.dome.position = vec3( 0, 0, 0 );
	domik.mirror.position = vec3( domik.dome.radius+domik.mirror.offset, domik.mirror.elevation, 0);
	domik.projector.position = vec3( domik.dome.radius+domik.mirror.offset+domik.projector.offset-domik.mirror.radius, domik.mirror.elevation+domik.projector.elevation, 0);


	const r = domik.mirror.radius;
	const mp = vec3sub( domik.mirror.position, domik.projector.position );
	const mu = vec3add( mp,vec3(0,r,0) );
	const mr = mp.clone().projectOnVector(mu);
	const ms = vec3add( vec3sub(mr,mp).normalize().multiplyScalar(r), mp );
	const mw = ms.multiplyScalar(mp.x/ms.x);
	const x = -domik.dome.radius;
	const fp = vec3sub( onMirrorReflect( domik, vec3(x,0,0) ), domik.projector.position );
	const fw = fp.multiplyScalar(mw.x/fp.x);

	domik.wrap = {
		up: mw,
		down: fw,
		factor: 1/(mw.y-fw.y),
		base: mp.x,
		maxray: Math.sqrt( ms.length()*ms.length()+r*r )*0.9
	}
}

function angleTest( domik, dd, pp, mm ) {
	const rd = dd.clone().sub(mm);
	const rp = pp.clone().sub(mm);
	const rm = mm.clone().sub(domik.mirror.position);
	const ad = 180*rm.angleTo(rd)/Math.PI;
	const ap = 180*rm.angleTo(rp)/Math.PI;
	return Math.abs(ad - ap);
}

function onMirror( domik, v ) {
	return v.clone().sub(domik.mirror.position).normalize().multiplyScalar(domik.mirror.radius).add(domik.mirror.position);
}

function onMirrorReflect( domik, dd ) {
	const pp = domik.projector.position;
	let dm = onMirror(domik, dd);
	let pm = onMirror(domik, pp);
	let limit = 50;
	while(limit) {
		const pd = dm.clone().sub(pm);
		const mm_0 = onMirror(domik, pd.clone().multiplyScalar(1/3).add(pm));
		const mm_1 = onMirror(domik, pd.clone().multiplyScalar(2/3).add(pm));
		const ts_0 = angleTest(domik, dd, pp, mm_0);
		const ts_1 = angleTest(domik, dd, pp, mm_1);
		if (ts_0<ts_1) {
			dm.copy(mm_1);
		} else {
			pm.copy(mm_0);
		}
		var mm = mm_0.clone().add(mm_1).multiplyScalar(0.5);
		limit--;
	}
	return mm;
}

function onProjector(domik, dd) {
	const maxray = domik.wrap.maxray;
	const pp = domik.projector.position;
	const pr = onMirrorReflect(domik, dd);
	const rayDist = pr.distanceTo(pp);
	if (rayDist>maxray) return null;
	const fp = vec3sub( pr, domik.projector.position );
	const fw = fp.multiplyScalar( domik.wrap.base/fp.x );
	const ps = vec3sub( vec3sub( fw, domik.wrap.down ).multiplyScalar( domik.wrap.factor*2 ),vec3(0,1,0) );
	return ps;
}

function getOption(id) {
	if(id=="segment_count") return 12 + 1;
	if(id=="scale") return 1;
}

function addPoint( points, point ) {
	if( point===null ) {
	} else {
		points.push(point);
	}
}

function makeWrap(domik) {
	const points = [];
	const segment = getOption("segment_count");
	const scale = getOption("scale");
	const subdiv = 5;
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

function animate() {
	requestAnimationFrame( animate );
	wrap.scale.set( 0, domik.screen.scale, domik.screen.scale );
	wrap.position.x = domik.screen.horz;
	wrap.position.y = domik.screen.vert;

	renderer.render( scene, camera );
}

renderer.render( scene, camera );
animate();