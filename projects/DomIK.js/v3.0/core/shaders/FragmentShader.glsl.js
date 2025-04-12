export default /* glsl */ `

#define M_PI 3.1415926535897932384626433832795
#define M_PI_2 (M_PI/2.0)
#define M_PI_4 (M_PI/4.0)
#define M_2_PI (M_PI*2.0)

#define M_S2 0.7071067811865475

uniform sampler2D img_dome;
uniform float scope_dome;
uniform float rotate_dome;

uniform sampler2D img_cube;
uniform float scope_cube;
uniform float rotate_cube;

uniform float tilt;
uniform float flexture;
uniform float seamless;

uniform int stype;
uniform int dtype;

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

uniform float ud_mirror_radius;
uniform vec3 ud_shift;
uniform float ud_factor;
uniform vec3 ud_dome;
uniform vec3 ud_mirror;
uniform vec3 ud_projector;
uniform vec3 ud_base;

uniform vec3 ud_sour;
uniform vec3 ud_dest;

varying vec2 v_uv;

#define easy_block

bool space_color(vec2 vv, out vec4 color) {
    color = texture2D(img_dome, vv);
    return true;
}

#define easy_block

bool intersectSphere(vec3 origin, vec3 direction, vec3 center, float radius, out vec3 target) {
    vec3 vector = center-origin;
    float tca = dot(vector, direction);
    float d2 = dot(vector, vector) - tca*tca;
    float radius2 = radius*radius;
    target = vec3(1.0, 0.5, 0.1);
    if(d2>radius2) return false;
    float thc = sqrt(radius2-d2);
    float t0 = tca-thc;
    float t1 = tca+thc;
    if(t1<0.0) return false;
    target = origin+direction*(t0<0.0?t1:t0);
    return true;
}

bool onDomeFromUV(vec2 uv, float factor, vec3 shift, vec3 dome, vec3 mirror, float mirror_radius, vec3 projector, out vec3 dm) {
    vec3 pm;
    vec3 tmp = vec3(2.0*(uv.x-0.5), uv.y, 0.0 );
    tmp = tmp/factor + shift + mirror;
    vec3 direction = normalize(tmp - projector);
    if(intersectSphere(projector, direction, mirror, mirror_radius, pm)){
        vec3 normal = normalize(pm - mirror);
        vec3 point = pm - projector;
        vec3 direction = normalize(reflect(point, normal));
        vec3 origin = pm;
        if( intersectSphere(origin, direction, dome, 1.0, dm) ) return true;
    }
    return false;
}

bool cropUV( vec2 uv0, out vec2 uv1 ) {
    float x = uv0.x;
    float y = uv0.y;

    float sour_width = ud_sour.x;
    float sour_height = ud_sour.y;
    float sour_shift = ud_sour.z;

    float dest_width = ud_dest.x;
    float dest_height = ud_dest.y;
    float dest_shift = ud_dest.z;

    x = (x-0.5)*2.0;
    if( abs(x)>sour_width) return false;
    x = (x*dest_width+1.0)/2.0;

    y = (y+sour_shift-0.5)*2.0;
    if( abs(y)>sour_height) return false;
    y = (y*dest_height+dest_shift+1.0)/2.0;

    if( x<0.0 || x>1.0 || y<0.0 || y>1.0) return false;
    uv1.x = x;
    uv1.y = y;
    return true;
}

bool onDomeTransform(vec3 dm, float scope, float rotate, out vec3 xyz, out vec2 qp ) {
    float x = dm.x;
    float y = dm.y;
    float z = dm.z;
    float q = atan(sqrt(x*x+z*z),y)*scope;
    float p = mod(atan(z, x)+rotate*M_PI, M_2_PI);
    x = sin(q)*cos(p);
    z = sin(q)*sin(p);
    y = cos(q);
    float ny = y*cos(tilt*M_PI) - z*sin(tilt*M_PI);
    float nz = y*sin(tilt*M_PI) + z*cos(tilt*M_PI);
    xyz = vec3(x,ny,nz);
    qp = vec2(q,p);
    return true;
}

bool onUVFisheyeFromQP(vec2 qp, out vec2 uv) {
    float q = qp.x;
    float p = qp.y;
    float r = q/M_PI;
    uv.x = (r*cos(p)+1.0)/2.0;
    uv.y = (r*sin(p)+1.0)/2.0;
    return true;
}

bool onUVEquirectangularFromQP(vec2 qp, out vec2 uv) {
    float q = qp.x;
    float p = qp.y;
    float r = q/M_PI;
    float y = 1.0-r;
    float x = (p/M_PI+1.0)/2.0+0.25;
    x = x>1.0?x-1.0:x;
    uv = vec2(x, y);
    return true;
}

bool onUVCubemapFromDome(vec3 p, out vec2 uv) {
    float x = p.z;
    float y = p.y;
    float z = p.x;

    float mx = 2.0*abs(x);
    float my = 2.0*abs(y);
    float mz = 2.0*abs(z);

    if( mx>=my && mx>=mz ) {
        uv = x>=0.0 ? vec2( (y/mx+1.5)/3.0, (z/mx+0.5)/2.0 ): vec2( (z/mx+1.5)/3.0, (y/mx+1.5)/2.0 );
        return true;
    }
    if(mz>=mx && mz>=my) {
        uv = z>=0.0 ? vec2( (x/mz+2.5)/3.0, (y/mz+1.5)/2.0 ): vec2( (0.5-x/mz)/3.0, (y/mz+1.5)/2.0 );
        return true;
    }
    if( my>=mx && my>=mz ) {
        uv = y>=0.0 ? vec2( (2.5-x/my)/3.0, (z/my+0.5)/2.0 ): vec2( (0.5+x/my)/3.0, (z/my+0.5)/2.0 );
        return true;
    }
    return false;
}

void colorFromImage(sampler2D image, vec2 uvs, out vec4 color) {
    vec2 uv;
    if(cropUV(uvs,uv)){
        color = texture2D(image, uv);
    }
}

bool onFisheye2(vec2 uv, out vec3 dm) {
    float aspect = 16.0/9.0;
    float x = (2.0*uv.x-1.0) * aspect;
    float y = (2.0*uv.y-1.0);
    float rr = x*x+y*y;
    if(rr<=1.0){
        float z = sqrt(1.0-rr);
        dm = vec3(x,z,y);
        return true;
    }
    return false;
}

bool onFisheye(vec2 uv, out vec3 dm) {
    float aspect = 16.0/9.0;
    float x = (2.0*uv.x-1.0) * aspect;
    float y = (2.0*uv.y-1.0);
    float rr = x*x+y*y;
    if(rr<=1.0){
        float r = sqrt(rr);
        float b = r*M_PI_2;
        r = sin(b);
        float a = atan(y,x)-M_PI_2;
        dm = vec3(-r*sin(a),cos(b),r*cos(a));
        return true;
    }
    return false;
}

bool onEquirectangular2(vec2 uv, out vec3 dm) {
    float y = uv.y;
    float r = sqrt(1.0-y*y);
    float a = -2.0*uv.x*M_PI;
    float x = r*sin(a);
    float z = r*cos(a);
    dm = vec3(x,y,z);
    return true;
}

bool onEquirectangular(vec2 uv, out vec3 dm) {
    float b = M_PI_2*uv.y;
    float r = cos(b);
    float a = -2.0*uv.x*M_PI;
    dm = vec3(r*sin(a),sin(b),r*cos(a));
    return true;
}

bool onPolar2(vec2 uv, out vec3 dm) {
    float aspect = resolution.x/resolution.y;
    float x = (2.0*uv.x-1.0);
    float y = (2.0*uv.y-1.0);
    float rr = x*x+y*y;
    if(rr<=1.0){
        float a = atan(y,x)+M_PI_2;
        x = (a/M_PI+1.0)/2.0;
        float r = sqrt(rr);
        y = 1.0-r;
        r = sqrt(1.0-y*y);
        a = -2.0*x*M_PI;
        x = r*sin(a);
        float z = r*cos(a);
        dm = vec3(x,y,z);
        return true;
    }
    return false;
}

bool onPolar3(vec2 uv, out vec3 dm) {
    float aspect = 16.0/9.0;
    float x = (2.0*uv.x-1.0) * aspect;
    float y = (2.0*uv.y-1.0);
    float rr = x*x+y*y;
    if(rr<=1.0){
        float a = atan(y,x)+M_PI_2;
        x = (a/M_PI+1.0)/2.0;
        float r = sqrt(rr);
        y = 1.0-r;
        r = sqrt(1.0-y*y);
        a = -2.0*x*M_PI;
        x = r*sin(a);
        float z = r*cos(a);
        dm = vec3(x,y,z);
        return true;
    }
    return false;
}

bool onPolar(vec2 uv, out vec3 dm) {
    float aspect = 16.0/9.0;
    float x = (2.0*uv.x-1.0) * aspect;
    float y = (2.0*uv.y-1.0);
    float rr = x*x+y*y;
    if(rr<=1.0){
        float a = -(atan(y,x)+1.5*M_PI);
        float r = sqrt(rr);
        float b = M_PI_2*(1.0-r);
        r = cos(b);
        dm = vec3(r*sin(a),sin(b),r*cos(a));
        return true;
        // float r = cos(M_PI_2*uv.y);
        // float a = -2.0*uv.x*M_PI;
        // dm = vec3(r*sin(a),sin(b),r*cos(a));
        // return true;
    }
    return false;

}

void main() {
    vec2 uvs = v_uv;
    vec4 c_cube = vec4(0.0, 0.0, 0.0, 0.0);
    vec4 c_dome = vec4(0.0, 0.0, 0.0, 1.0);
    vec4 c_d = texture2D(img_cube, uvs);

    vec3 dm;
    bool check = false;
    switch( dtype ) {
        case 1: check=onFisheye( uvs, dm ); break;
        case 2: check=onEquirectangular(uvs, dm); break;
        case 3: check=onDomeFromUV(uvs, ud_factor, ud_shift, ud_dome, ud_mirror, ud_mirror_radius, ud_projector, dm); break;
        case 4: check=onPolar( uvs, dm ); break;
    }
    if( check ) {
        check = false;
        vec3 xyz;
        vec2 qp;
        onDomeTransform(dm, scope_dome, rotate_dome, xyz, qp);
        switch(stype) {
            case 2: check=onUVFisheyeFromQP(qp, uvs); break;
            case 3: check=onUVEquirectangularFromQP(qp, uvs); break;
            case 4: check=onUVCubemapFromDome(xyz, uvs); break;
        }
        if( check ) {
            space_color( uvs, c_dome );
        }
        onDomeTransform(dm, scope_cube, rotate_cube, xyz, qp);
        if( onUVCubemapFromDome(xyz, uvs) ) {
            colorFromImage(img_cube, uvs, c_cube);
        }
        gl_FragColor = c_cube+c_dome*(1.0-c_cube.a);
    } else {
        gl_FragColor = vec4( 0.1, 0.1, 0.1, 1.0 );
    }
    // #include <colorspace_fragment>
}
`