export default /* glsl */ `

#define M_PI 3.1415926535897932384626433832795
#define M_PI_2 (M_PI/2.0)
#define M_PI_4 (M_PI/4.0)

#define M_S2 0.7071067811865475

uniform sampler2D image;
uniform sampler2D skin;

uniform float factor;
uniform float rotate;
uniform float flexture;
uniform float seamless;
uniform int transform;

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

uniform float ud_rm;
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
    color = texture2D(skin, vv);
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

bool onMirrorFromScreen(vec3 ps, float factor, vec3 shift, vec3 mp, float rm, vec3 pp, out vec3 pm){
    vec3 tmp = vec3(ps.x, ps.y, 0.0);
    tmp = tmp/factor + shift + mp;
    vec3 direction = normalize(tmp - pp);
    return intersectSphere(pp, direction, mp, rm, pm);
}

bool onDomeFromMirror(vec3 pm, vec3 dp, vec3 mp, vec3 pp, out vec3 xyz, out vec2 qp){
    vec3 normal = normalize(pm - mp);
    vec3 point = pm - pp;
    vec3 direction = normalize(reflect(point, normal));
    vec3 origin = pm;
    vec3 v;
    if( intersectSphere(origin, direction, dp, 1.0, v) ){
        float x = v.x;
        float y = v.y;
        float z = v.z;
        float q = atan(sqrt(x*x+z*z), y)*factor;
        float p = atan(z, x)+rotate*M_PI;
        x = sin(q)*cos(p);
        z = sin(q)*sin(p);
        y = cos(q);
        xyz = vec3(x,y,z);
        qp = vec2(q,p);
        return true;
    };
    return false;
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
    float y = 1.0-qp.x/M_PI;
    float x = (qp.y/M_PI+1.0)/2.0+0.25;

    float sour_width = ud_sour.x;
    float sour_height = ud_sour.y;
    float sour_shift = ud_sour.z;

    float dest_width = ud_dest.x;
    float dest_height = ud_dest.y;
    float dest_shift = ud_dest.z;

    x = x>1.0?x-1.0:x;

    x = (x-0.5)*2.0;
    if( abs(x)>sour_width) return false;
    x = (x*dest_width+1.0)/2.0;

    y = (y+sour_shift-0.5)*2.0;
    if( abs(y)>sour_height) return false;
    y = (y*dest_height+dest_shift+1.0)/2.0;


    uv = vec2(x, y);
    return true;
}

bool onUVCubemapFromDome(vec3 p, out vec2 uv) {
    float x = p.z;
    float y = p.y;
    float z = p.x;
    if( true ) {
        float dx = x;
        float dy = y;
        float dz = z;
        float mx = 2.0*abs(dx);
        float my = 2.0*abs(dy);
        float mz = 2.0*abs(dz);
        if( mx>my && mx>mz ) {
            dx = dx/mx;
            dy = dy/mx;
            dz = dz/mx;
            if(dx>0.0) {
                x = (dy+0.5+1.0)/3.0;
                y = (dz+0.5+0.0)/2.0;
            } else {
                x = (dz+0.5+1.0)/3.0;
                y = (dy+0.5+1.0)/2.0;
            }
        } else {
            if(mz>mx && mz>my) {
                dx = dx / mz;
                dy = dy / mz;
                dz = dz / mz;
                if( dz>0.0 ) {
                    x = (dx+0.5+2.0)/3.0;
                    y = (dy+0.5+1.0)/2.0;
                } else {
                    x = (0.5-dx+0.0)/3.0;
                    y = (dy+0.5+1.0)/2.0;
                }
            } else {
                if( my>mx && my>mz ) {
                    dx = dx / my;
                    dy = dy / my;
                    dz = dz / my;
                    if( dy>0.0 ){
                        x = (0.5-dx+2.0)/3.0;
                        y = (dz+0.5+0.0)/2.0;
                    } else {
                        x = (dx+0.5+0.0)/3.0;
                        y = (dz+0.5+0.0)/2.0;
                    }
                } else {
                    x = dx;
                    y = dy;
                }
            }
        }
        uv = vec2(x, y);
        return true;
    }
    return false;
}

bool onUVCineramaFromDome(vec3 p, out vec2 uv) {
    float x = p.x;
    float y = p.y;
    float z = -p.z;
    float ys = y/z;
    float xs1 = (x/z+1.0)/2.0;
    float xs2 = (x/M_S2+1.0)/2.0;
    float xs = xs1*(1.0-flexture)+xs2*flexture;
    if( ys>0.0 && ys<1.0 && xs>0.0 && xs<1.0 && z>0.0 ) {
        uv = vec2( xs, ys );
        return true;
    }
    return false;
}

void main() {
    vec2 uvs = v_uv;
    if( transform==1 ) {
        gl_FragColor = texture2D(image, uvs);
    } else {
        vec3 tmp = vec3(2.0*(v_uv.x-0.5), v_uv.y, 0.0 );
        if(onMirrorFromScreen(tmp, ud_factor, ud_shift, ud_mirror, ud_rm, ud_projector, tmp)) {
            vec3 xyz;
            vec2 qp;
            if(onDomeFromMirror(tmp, ud_dome, ud_mirror, ud_projector, xyz, qp)) {
                switch(transform) {
                case 0:
                    if(onUVFisheyeFromQP(qp, uvs)) space_color( uvs, gl_FragColor );
                    break;
                case 2:
                    if(onUVFisheyeFromQP(qp, uvs)) gl_FragColor = texture2D(image, uvs);
                    break;
                case 3:
                    if(onUVEquirectangularFromQP(qp, uvs)) gl_FragColor = texture2D(image, uvs);
                    break;
                case 4:
                    if(onUVCubemapFromDome(xyz, uvs)) gl_FragColor = texture2D(image, uvs);
                    break;
                case 5:
                    if(onUVCineramaFromDome(xyz, uvs)) {
                        gl_FragColor = texture2D(image, uvs);
                    } else {
                        if(onUVFisheyeFromQP(qp, uvs)) space_color( uvs, gl_FragColor );
                    }
                    break;
                default:
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                }
            }
   	    }
    }
}

`