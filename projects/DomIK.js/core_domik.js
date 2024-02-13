import * as THREE from './vendor/three.module.min.js';

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
    return onMirror( domik, mm );
}

export function get_options() {
    return domik_options;
}

export function onProjector( x, y, z ) {
    const domik = domik_options;
    const dd = vec3( x, y, z );
    const maxray = domik.wrap.maxray;
    const pp = domik.projector.position;
    const pr = onMirrorReflect( domik, dd );
    const rayDist = pr.distanceTo( pp );
    if ( rayDist>maxray ) return null;
    const fp = vec3sub( pr, domik.projector.position );
    const fw = vec3mulf( fp,  domik.wrap.base/fp.x );
    const ps = vec3mulf( vec3sub( fw, domik.wrap.shift ), domik.wrap.factor );
	return ps;
}

export function recalc() {
    calcDomik( domik_options );
}