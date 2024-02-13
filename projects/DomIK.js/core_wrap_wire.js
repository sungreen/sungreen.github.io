import * as THREE from './vendor/three.module.min.js';
import * as DOMIK from './core_domik.js';

// WRAP

const wrap_options = {
    segment_count: 13,
    scale: 1,
    subdiv: 5
}

function addPoint( points, point ) { if(point===null) {} else { points.push(point); } }

function makeWrap( app ) {
    const domik = DOMIK.get_options();
    const wrap = wrap_options;

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

export function get_root( app ) {
    return makeWrap( app );
}

export function get_options() {
    return wrap_options;
}
