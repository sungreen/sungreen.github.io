import * as THREE from './vendor/three.module.min.js';
import * as DOMIK from './core_domik.js';

// WARP WIRE

const options = {
    wireframe: true,
    segments: 9,
    subdiv: 7,
}
const controls = {
    segments: {}
}

export function init( app, folder ) {
    folder.add( options, 'wireframe' ).name("show wireframe");
    controls.segments = folder.add( options, 'segments' );
}

export function update( app ) {
    if (options.wireframe) {
        controls.segments.show();
    } else {
        controls.segments.hide();
    }
    
}

export function refresh( app ) {
}

function addPoint( points, point ) { if(point===null) {} else { points.push(point); } }

function make( app ) {
    const domik = DOMIK.get_options();
    const warp = options;

    const segment = warp.segments;
    const subdiv = warp.subdiv;
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
                let point = DOMIK.onProjector( x, y, z );
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
                let point = DOMIK.onProjector( x, y, z );
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
                let point = DOMIK.onProjector( x, y, z );
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

export function get_shape( app ) {
    const warp = make( app );
    warp.rotation.y = Math.PI/2;
    return warp;
}

export function get_options() {
    return options;
}