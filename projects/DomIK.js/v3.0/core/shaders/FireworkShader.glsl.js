export default /* glsl */ `
varying vec2 v_uv;
uniform float time;

#define PI 3.141592653589793238
#define TWOPI 6.283185307179586
#define S(x,y,z) smoothstep(x,y,z)
#define B(x,y,z,w) S(x-z, x+z, w)*S(y+z, y-z, w)
#define saturate(x) clamp(x,0.,1.)

#define NUM_EXPLOSIONS 8.
#define NUM_PARTICLES 70.

// Noise functions by Dave Hoskins 
#define MOD3 vec3(.1031,.11369,.13787)
vec3 hash31(float p) {
  vec3 p3 = fract(vec3(p) * MOD3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

float hash12(vec2 p){
  vec3 p3  = fract(vec3(p.xyx) * MOD3);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z);
}

float circ(vec2 uv, vec2 pos, float size) {
  uv -= pos;
  size *= size;
  return S(size*1.1, size, dot(uv, uv));
}

float light(vec2 uv, vec2 pos, float size) {
  uv -= pos;
  size *= size;
  return size/dot(uv, uv);
}

vec3 explosion(vec2 uv, vec2 p, float seed, float t) {
  vec3 col = vec3(0.);
  vec3 en = hash31(seed);
   vec3 baseCol = en;
  for(float i=0.; i<NUM_PARTICLES; i++) {
    vec3 n = hash31(i)-.5;
    vec2 startP = p-vec2(0., t*t*.1);        
    vec2 endP = startP+normalize(n.xy)*n.z;
    float pt = 1.-pow(t-1., 2.);
    vec2 pos = mix(p, endP, pt);    
    float size = mix(.01, .005, S(0., .1, pt));
    size *= S(1., .1, pt);
    float sparkle = (sin((pt+n.z)*100.)*.5+.5);
    sparkle = pow(sparkle, pow(en.x, 3.)*50.)*mix(0.01, .01, en.y*n.y);
    size += sparkle*B(en.x, en.y, en.z, t);
    col += baseCol*light(uv, pos, size);
  }
  return col;
}

vec3 Rainbow(vec3 c) {
  float t=time;
  float avg = (c.r+c.g+c.b)/3.;
  c = avg + (c-avg)*sin(vec3(0., .333, .666)+t);
  c += sin(vec3(.4, .3, .3)*t + vec3(1.1244,3.43215,6.435))*vec3(.4, .1, .5);
  return c;
}

//void mainImage( out vec4 fragColor, in vec2 fragCoord )
void main()
{
  //vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 uv = v_uv;
  uv.x -= .5;
  uv.x *= 1.0; //iResolution.x/iResolution.y;
  float n = hash12(uv+10.);
  float t = time*.5;
  vec3 c = vec3(0.);
  for(float i=0.; i<NUM_EXPLOSIONS; i++) {
    float et = t+i*1234.45235;
    float id = floor(et);
    et -= id;
    vec2 p = hash31(id).xy;
    p.x -= .5;
    p.x *= 1.6;
    c += explosion(uv, p, id, et);
  }
  c = Rainbow(c);
  float f = c.r*c.g*c.b;
  float a = f>0.3?f:0.0;
  gl_FragColor = vec4(c, c.r*c.g*c.b);
}

// void main() {
//   vec2 uv = v_uv;
//   float f = (sin(max(abs(uv.x*2.0-1.0), abs(uv.y*2.0-1.0))*30.0+time*10.0)+1.0)/2.0;
//   gl_FragColor = vec4(1.0, 0.2, 0.1, f);

//   #include <colorspace_fragment>
// }

`