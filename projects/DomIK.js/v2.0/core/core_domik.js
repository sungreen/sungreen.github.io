import * as THREE from 'three';

export let unidome = {}

export function calcDomik( dome, mirror, projector ) {
    const Scale = 1.0/dome.radius;
    const Rd = 1.0;
    const Rm = mirror.radius*Scale;
    const Sm = mirror.offset*Scale;
    const Em = mirror.elevation*Scale;
    const Gm = mirror.shift*Scale;
    const Sp = projector.offset*Scale;
    const Ep = projector.elevation*Scale;

    const Mp = new THREE.Vector3( 0, Em, Rd+Sm);
    const Pp = new THREE.Vector3( 0, Em+Ep, Rd+Sm-Rm-Sp );
    const Df = new THREE.Vector3( 0, 0, -Rd );
    const Dz = new THREE.Vector3( 0, Rd, 0 );

    unidome.dome = new THREE.Vector3( Gm, 0, 0 );
    unidome.mirror = Mp;
    unidome.projector = Pp;

    const M = Mp.clone().sub( Pp );
    const Mf = onMirrorFromDome( Df ).sub( Pp );
    const Mz = onMirrorFromDome( Dz ).sub( Pp );
    const Pf = Mf.multiplyScalar( M.z/Mf.z );
    const Pz = Mz.multiplyScalar( M.z/Mz.z );

    unidome.rm = Rm;
    unidome.shift = new THREE.Vector3( 0, Pf.y, 0 );
    unidome.factor = 0.5/(Pz.y-Pf.y);
    unidome.base = M.z;
    unidome.basis = Pf;
    unidome.zenit = Pz;
}

function angleTest( dd, pp, mm, mp ) {
    const rd = dd.clone().sub( mm );
    const rp = pp.clone().sub( mm );
    const rm = mm.clone().sub( mp );
    const ad = 180*rm.angleTo(rd)/Math.PI;
    const ap = 180*rm.angleTo(rp)/Math.PI;
    return Math.abs(ad - ap);
}

function onMirror( v ) {
    const mp = unidome.mirror;
    const mr = unidome.rm;
    return v.clone().sub( mp ).normalize().multiplyScalar( mr ).add( mp );
}

function onMirrorFromDome( pointOnDome ) {
    const origin = unidome.projector;
    const mirror = unidome.mirror;
    let dm = onMirror( pointOnDome );
    let pm = onMirror( origin );
    let limit = 50;
    while(limit) {
        const mm_0 = onMirror( dm.clone().lerp( pm, 2/3 ) );
        const mm_1 = onMirror( dm.clone().lerp( pm, 1/3 ) );
        const ts_0 = angleTest( pointOnDome, origin, mm_0, mirror );
        const ts_1 = angleTest( pointOnDome, origin, mm_1, mirror );
        if( Math.abs(ts_0-ts_1)<0.00001 ) return onMirror( mm_0 );
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

export function onProjector( x, y, z ) {
    const pp = unidome.projector;
    const base = unidome.base;
    const shift = unidome.shift;
    const factor =  unidome.factor;
    const pointOnDome = unidome.dome.clone().add( new THREE.Vector3( x, y, z ) );
    const pointOnMirror = onMirrorFromDome( pointOnDome );
    const tmp = pointOnMirror.sub( pp );
    const pointOnScreen = tmp.multiplyScalar( base/tmp.z ).sub( shift ).multiplyScalar( factor ).setComponent(2,0);
    return pointOnScreen;
}

function onMirrorFromScreen( pointOnScreen ) {
    const mirror = new THREE.Sphere( unidome.mirror, unidome.rm );
    const factor = unidome.factor;
    const shift = unidome.shift;
    const Mp = unidome.mirror;
    const Pp = unidome.projector;
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
    const Dp = unidome.dome;
    const Mp = unidome.mirror;
    const Pp = unidome.projector;
    const Rd = 1.0;
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
    const Rd = 1.0;
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