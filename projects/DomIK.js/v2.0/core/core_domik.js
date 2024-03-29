import * as THREE from 'three';
import { options } from './core_options.js'

options.dome = { radius:0, position:new THREE.Vector3( 0, 0, 0) };
options.mirror = { radius:0, offset:0, elevation:0 };
options.projector = { offset:0, elevation:0 };

export function init( app, folder ) { calcDomik(); }
export function update( app ) { calcDomik(); }

function calcDomik() {
    const Rd = options.dome.radius;
    const Rm = options.mirror.radius;
    const Sm = options.mirror.offset;
    const Em = options.mirror.elevation;
    const Sp = options.projector.offset;
    const Ep = options.projector.elevation;
    const Mp = new THREE.Vector3( 0, Em, Rd+Sm);
    const Pp = new THREE.Vector3( 0, Em+Ep, Rd+Sm-Rm-Sp );
    const Df = new THREE.Vector3( 0, 0, -Rd );
    const Dz = new THREE.Vector3( 0, Rd, 0 );
    options.mirror.position = Mp;
    options.projector.position = Pp;
    const M = Mp.clone().sub( Pp );
    const Mf = onMirrorFromDome( Df ).sub( Pp );
    const Mz = onMirrorFromDome( Dz ).sub( Pp );
    const Pf = Mf.multiplyScalar( M.z/Mf.z );
    const Pz = Mz.multiplyScalar( M.z/Mz.z );
    options.warp = {
        shift: new THREE.Vector3( 0, Pf.y, 0 ),
        factor: 0.5/(Pz.y-Pf.y),
        base: M.z,
        basis: Pf,
        zenit: Pz
    }
}

function angleTest( dd, pp, mm ) {
    const rd = dd.clone().sub( mm );
    const rp = pp.clone().sub( mm );
    const rm = mm.clone().sub( options.mirror.position );
    const ad = 180*rm.angleTo(rd)/Math.PI;
    const ap = 180*rm.angleTo(rp)/Math.PI;
    return Math.abs(ad - ap);
}

function onMirror( v ) {
    const mp = options.mirror.position;
    const mr = options.mirror.radius;
    return v.clone().sub( mp ).normalize().multiplyScalar( mr ).add( mp );
}

function onMirrorFromDome( pointOnDome ) {
    const origin = options.projector.position;
    let dm = onMirror( pointOnDome );
    let pm = onMirror( origin );
    let limit = 50;
    while(limit) {
        const mm_0 = onMirror( dm.clone().lerp( pm, 2/3 ) );
        const mm_1 = onMirror( dm.clone().lerp( pm, 1/3 ) );
        const ts_0 = angleTest( pointOnDome, origin, mm_0);
        const ts_1 = angleTest( pointOnDome, origin, mm_1);
        if (ts_0<ts_1) {
            dm.copy(mm_1);
        } else {
            pm.copy(mm_0);
        }
        var mm = mm_0.clone().lerp( mm_1, 1/2 );
        limit--;
    }
    return onMirror( mm );
}

function onMirrorFromScreen( pointOnScreen ) {
    const mirror = new THREE.Sphere( options.mirror.position, options.mirror.radius );
    const factor = options.warp.factor;
    const shift = options.warp.shift;
    const Mp = options.mirror.position;
    const Pp = options.projector.position;
    const tmp = pointOnScreen.clone().multiplyScalar( 1/factor ).add( shift ).add( Mp );
    const direction = tmp.sub( Pp ).normalize();
    const ray = new THREE.Ray( Pp, direction );
    if( ray.intersectsSphere( mirror ) ) {
        var target = new THREE.Vector3();
        const result = ray.intersectSphere( mirror, target );
        return result;
    }
    return null;
}

function onDomeFromMirror( pointOnMirror ) {
    const Dp = options.dome.position;
    const Mp = options.mirror.position;
    const Pp = options.projector.position;
    const Rd = options.dome.radius;
    const normal = pointOnMirror.clone().sub( Mp ).normalize();
    const point = pointOnMirror.clone().sub( Pp );
    const direction = point.reflect( normal ).normalize();
    const dome = new THREE.Sphere( Dp, Rd );
    const ray = new THREE.Ray( pointOnMirror, direction );
    if( ray.intersectsSphere( dome ) ) {
        var target = new THREE.Vector3();
        const result = ray.intersectSphere( dome, target );
        return target;
    }
    return null;
}

export function onUVFisheyeFromDome( pointOnDome ) {
    const Rd = options.dome.radius;
    const p = pointOnDome.clone().divideScalar( Rd );
    const r = Math.sqrt(p.x*p.x + p.z*p.z);
    const b = Math.atan2( p.y, r );
    const a = Math.atan2( p.x, p.z); // z<>x
    const pr = 1 - 2*b/Math.PI;
    const x = (pr*Math.cos(a)+1)/2;
    const y = (pr*Math.sin(a)+1)/2;
    return new THREE.Vector3( x, y, 0 );
}

export function onDomeFromScreen( pointOnScreen ) {
    const pointOnMirror = onMirrorFromScreen( pointOnScreen );
    if ( pointOnMirror!=null ){
        return onDomeFromMirror( pointOnMirror );
    }
    return null;
}

export function onProjector( x, y, z ) {
    const pp = options.projector.position;
    const base = options.warp.base;
    const shift = options.warp.shift;
    const factor =  options.warp.factor;
    const pointOnDome = new THREE.Vector3( x, y, z );
    const pointOnMirror = onMirrorFromDome( pointOnDome );
    const tmp = pointOnMirror.sub( pp );
    const pointOnScreen = tmp.multiplyScalar( base/tmp.z ).sub( shift ).multiplyScalar( factor ).setComponent(2,0);
    return pointOnScreen;
}