import * as THREE from './vendor/three.module.min.js';

// DOMIK

const options = {
    dome: { radius:0, position:new THREE.Vector3( 0, 0, 0) },
    mirror: { radius:0, offset:0, elevation:0 },
    projector: { offset:0, elevation:0 },
    warp: {}
}

const controls = {
    dome: {},
    mirror: {},
    projector: {}
}

export function init( app, folder ) {
    const domik = get_options();
    calcDomik();

    controls.dome = folder.addFolder( 'Dome' );
    controls.dome.add( domik.dome, 'radius', 2, 5, 0.1 );

    controls.mirror = folder.addFolder( 'Mirror' );
    controls.mirror.add( domik.mirror, 'radius', 0.1, 0.5, 0.01 );
    controls.mirror.add( domik.mirror, 'offset', -1, 1, 0.01 );
    controls.mirror.add( domik.mirror, 'elevation', -1, 1, 0.01 );

    controls.projector = folder.addFolder( 'Projector' );
    controls.projector.add( domik.projector, 'offset', 0.1, 1, 0.01 );
    controls.projector.add( domik.projector, 'elevation', -1, 1, 0.01 );
}

export function update( app ) {
    calcDomik();
}

export function refresh( app ) {
}

function calcDomik() {
    const domik = get_options();

    const Rd = domik.dome.radius;
    const Rm = domik.mirror.radius;
    const Sm = domik.mirror.offset;
    const Em = domik.mirror.elevation;
    const Sp = domik.projector.offset;
    const Ep = domik.projector.elevation;

    const Mp = new THREE.Vector3( Rd+Sm, Em, 0);
    const Pp = new THREE.Vector3( Rd+Sm-Rm-Sp, Em+Ep, 0 );
    const Db = new THREE.Vector3( -Rd, 0, 0 );
    const Dz = new THREE.Vector3(  0, Rd, 0 );

    domik.mirror.position = Mp;
    domik.projector.position = Pp;

    const M = Mp.clone().sub( Pp );
    const Mb = onMirrorFromDome( Db ).sub( Pp );
    const Mz = onMirrorFromDome( Dz ).sub( Pp );

    const base = M.x;
    const Pb = Mb.multiplyScalar( base/Mb.x );
    const Pz = Mz.multiplyScalar( base/Mz.x );

    domik.warp = {
        shift: new THREE.Vector3( 0, Pb.y, 0 ),
        factor: 1/(Pz.y-Pb.y),
        base: M.x,
        maxray: 1000,
        basis: Pb,
        zenit: Pz
    }
}

function angleTest( dd, pp, mm ) {
    const domik = get_options();

    const rd = dd.clone().sub( mm );
    const rp = pp.clone().sub( mm );
    const rm = mm.clone().sub( domik.mirror.position );
    const ad = 180*rm.angleTo(rd)/Math.PI;
    const ap = 180*rm.angleTo(rp)/Math.PI;
    return Math.abs(ad - ap);
}

function onMirror( v ) {
    const domik = get_options();

    const mp = domik.mirror.position;
    const mr = domik.mirror.radius;
    return v.clone().sub( mp ).normalize().multiplyScalar( mr ).add( mp );
}

function onMirrorFromDome( pointOnDome ) {
    const domik = get_options();

    const origin = domik.projector.position;
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
    const domik = get_options();
 
    const mirror = new THREE.Sphere( domik.mirror.position, domik.mirror.radius );
    const factor = domik.warp.factor;
    const shift = domik.warp.shift;
    const Mp = domik.mirror.position;
    const Pp = domik.projector.position;
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
    const domik = get_options();

    const Dp = domik.dome.position;
    const Mp = domik.mirror.position;
    const Pp = domik.projector.position;
    const Rd = domik.dome.radius;
    const normal = pointOnMirror.clone().sub( Mp ).normalize();
    const point = pointOnMirror.clone().sub( Pp );
    const direction = point.reflect( normal ).normalize();

    // For test equals reflec angle
    // const a = normal.angleTo(point);
    // const b = normal.angleTo(reflectPoint);
    // console.log(a-b,a,b);

    const dome = new THREE.Sphere( Dp, Rd );
    const ray = new THREE.Ray( pointOnMirror, direction );

    if( ray.intersectsSphere( dome ) ) {
        var target = new THREE.Vector3();
        const result = ray.intersectSphere( dome, target );
        return target;
    }
    return null;
}

export function get_options() {
    return options;
}

export function onDome( x, y, z ) {
    const pointOnScreen = new THREE.Vector3( x,y,z );
    const pointOnMirror = onMirrorFromScreen( pointOnScreen );
    if ( pointOnMirror!=null ){
        return onDomeFromMirror( pointOnMirror );
    }
    return null;
}

export function onProjector( x, y, z ) {
    const domik = options;
    const pp = domik.projector.position;
    const base = domik.warp.base;
    const shift = domik.warp.shift;
    const factor =  domik.warp.factor;

    const pointOnDome = new THREE.Vector3( x, y, z );
    const pointOnMirror = onMirrorFromDome( pointOnDome );
    const tmp = pointOnMirror.sub( pp );
    const pointOnScreen = tmp.multiplyScalar( base/tmp.x ).sub( shift ).multiplyScalar( factor ).setComponent(0,0);

    return pointOnScreen;
}