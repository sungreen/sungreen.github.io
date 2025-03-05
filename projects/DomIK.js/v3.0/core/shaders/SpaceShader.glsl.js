export default /* glsl */ `

#define easy_block
// 1

#define iterations 14
#define formuparam2 0.79
#define volsteps 5
#define stepsize 0.390
#define zoom 0.900
#define tile   0.850
#define speed2  0.0 
#define brightness 0.003
#define darkmatter 0.400
#define distfading 0.560
#define saturation 0.800
#define transverseSpeed zoom*2.0
#define cloud 0.11 
 
float triangle(float x, float a) { 
  float output2 = 2.0*abs(  2.0*  ( (x/a) - floor( (x/a) + 0.5) ) ) - 1.0;
  return output2;
}
 
float field(in vec3 p, float time) {	
  float strength = 7. + .03 * log(1.e-6 + fract(sin(time) * 4373.11));
  float accum = 0.;
  float prev = 0.;
  float tw = 0.;	
  float mag = dot(p, p);
  p = abs(p) / mag + vec3(-.5, -.8 + 0.1*sin(time*0.7 + 2.0), -1.1+0.3*cos(time*0.3));
  float w = exp(-float(0) / 7.);
  accum += w * exp(-strength * pow(abs(mag - prev), 2.3));
  tw += w;
  prev = mag;
  return max(0., 5. * accum / tw - .7);
}

bool space_color(vec2 vv, out vec4 color) {
  float x = 2.0*vv.x - 1.0;
  float y = 2.0*vv.y - 1.0;
  float time2 = time / 40.0;
  float speed = 0.01 * cos( time2 + M_PI_4 );
  vec2 uv = vec2(x,y);
  float a_xz = 0.9;
  float a_yz = -.6;
  float a_xy = 0.9 + time2*0.08;	
  mat2 rot_xz = mat2(cos(a_xz),sin(a_xz),-sin(a_xz),cos(a_xz));	
  mat2 rot_yz = mat2(cos(a_yz),sin(a_yz),-sin(a_yz),cos(a_yz));		
  mat2 rot_xy = mat2(cos(a_xy),sin(a_xy),-sin(a_xy),cos(a_xy));
  float v2 =1.0;
  vec3 dir=vec3(uv*zoom,1.);
  vec3 from=vec3(0.0, 0.0, 0.0);
  vec3 forward = vec3(0.,0.,1.);   
  from.x += transverseSpeed*(1.0)*cos(0.01*time2) + 0.001*time2;
  from.y += transverseSpeed*(1.0)*sin(0.01*time2) + 0.001*time2;
  from.z += 0.003*time2;
  dir.xy*=rot_xy;
  forward.xy *= rot_xy;
  dir.xz*=rot_xz;
  forward.xz *= rot_xz;	
  dir.yz*= rot_yz;
  forward.yz *= rot_yz;
  from.xy*=-rot_xy;
  from.xz*=rot_xz;
  from.yz*= rot_yz;
  float zooom = 1.0;
  from += forward* zooom;
  float sampleShift = mod( zooom, stepsize );
  float zoffset = -sampleShift;
  sampleShift /= stepsize;
  float s=0.24;
  float s3 = s + stepsize/2.0;
  vec3 v=vec3(0.);
  float t3 = 0.0;	
  vec3 backCol2 = vec3(0.);
  for (int r=0; r<volsteps; r++) {
    vec3 p2=from+(s+zoffset)*dir;
    vec3 p3=from+(s3+zoffset)*dir;
    p2 = abs(vec3(tile)-mod(p2,vec3(tile*2.)));
    p3 = abs(vec3(tile)-mod(p3,vec3(tile*2.)));
    #ifdef cloud
    t3 = field(p3, time2);
    #endif
    float pa,a=pa=0.;
    for (int i=0; i<iterations; i++) {
      p2=abs(p2)/dot(p2,p2)-formuparam2;
      float D = abs(length(p2)-pa);
      a += i > 7 ? min( 12., D) : D;
      pa=length(p2);
    }
    a*=a*a;
    float s1 = s+zoffset;
    float fade = pow(distfading,max(0.,float(r)-sampleShift));
    v+=fade;
    if( r == 0 ) fade *= (1. - (sampleShift));
    if( r == volsteps-1 ) fade *= sampleShift;
    v+=vec3(s1,s1*s1,s1*s1*s1*s1)*a*brightness*fade;
    backCol2 += mix(.11, 1., v2) * vec3(1.8 * t3 * t3 * t3, 1.4 * t3 * t3, t3) * fade;
    s+=stepsize;
    s3 += stepsize;
  }
  v=mix(vec3(length(v)),v,saturation);
  vec4 forCol2 = vec4(v*.01,1.);
  #ifdef cloud
  backCol2 *= cloud;
  #endif	
  backCol2.b *= 1.8;
  backCol2.r *= 0.05;
  backCol2.b = 0.5*mix(backCol2.g, backCol2.b, 0.8);
  backCol2.g = 0.0;
  backCol2.bg = mix(backCol2.gb, backCol2.bg, 0.5*(cos(time2*0.01) + 1.0));
  color = forCol2 + vec4(backCol2, 0.1);
  return true;
}


#define easy_block
// 2

float plasma(vec2 p, float iso, float fade)
{
  float c = 0.0;
  for (float i=1.0; i<10.0; ++i) {
    float f1 = i / 0.6;
    float f2 = i / 0.3;
    float f3 = i / 0.7;
    float f4 = i / 0.5;
    float s1 = i / 2.0;
    float s2 = i / 4.0;
    float s3 = i / 3.0;
    c += sin(p.x * f1 + time) * s1 + sin(p.y * f2 + 0.5 * time) * s2 + sin(p.x * f3 + p.y * f4 - 1.5 * time) * s3;
  }
  c = mod(c, 16.0) * 0.5 - 7.0;
  if (c < iso) { return 0.0; }
  else {
    if (c > 0.5) c = 1.0 - c;
    c *= 2.0;
    return c * fade;
  }
}

bool space_color(vec2 vv, out vec4 color) {
	vec2 pos = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
	float c = 0.0;
	for (float i=0.0; i<64.0; ++i) {
		float zoom = 1.0 + i * 0.05 + sin(time * 0.2) * 0.3;
		vec2 trans = vec2(sin(time * 0.3) * 0.5, sin(time * 0.4) * 0.2);
		c = plasma(pos * zoom + trans, 0.0, 2.0 / (1.0 + i));
		if (c> 0.001) break;
	}
	color = vec4(c * pos.x, c * pos.y, c * abs(pos.x + pos.y), 0.5) * 2.0;
  return true;
}

#define easy_block
// 3

const int   complexity      = 60;    // More points of color.
const float mouse_factor    = 356.0;  // Makes it more/less jumpy.
const float mouse_offset    = 5.0;   // Drives complexity in the amount of curls/cuves.  Zero is a single whirlpool.
const float fluid_speed     = 5.0;  // Drives speed, higher number will make it slower.
const float color_intensity = 0.5;

bool space_color(vec2 vv, out vec4 color){ 
  vec2 p = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
  vec3 finalCol = vec3(0,0,0);
  vec2 position = ( gl_FragCoord.xy / resolution.xy ) - mouse / 1.0;
  for(int i=1;i<complexity;i++) {
    vec2 newp=p + time*0.001;
    newp.x+=0.5/float(i)*sin(float(i)*p.y+time/fluid_speed+0.2*float(i)) + 0.2;
    newp.y+=0.4/float(i)*sin(float(i)*p.x+time/fluid_speed+0.3*float(i+10)) - 0.8;
    newp+=p/dot(newp,newp);
    p=newp;
  }
  vec3 col=vec3(color_intensity*sin(3.0*p.x)+color_intensity,color_intensity*sin(3.0*p.y)+color_intensity,color_intensity*sin(p.x+p.y)+color_intensity);
  finalCol = vec3(col*col);
  color=vec4(finalCol.rgb / col, 1) ;
  return true;
}

#define easy_block
// 4

bool space_color(vec2 vv, out vec4 color) {
  vec2 p = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
  float e = 0.0;
  for (float i=3.0;i<=15.0;i+=1.0) {
    e += 0.007/abs( (i/15.) +sin((time/2.0) + 0.15*i*(p.x) *( cos(i/4.0 + (time / 2.0) + p.x*2.2) ) ) + 2.5*p.y);
    color = vec4( vec3(e/1.6, e/11.6, e/1.6), 1.0);	
  }
  return true;
}

#define easy_block
// 5

#define NUM_OCTAVES 6

mat3 rotX(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    1, 0, 0,
    0, c, -s,
    0, s, c
  );
}

mat3 rotY(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    c, 0, -s,
    0, 1, 0,
    s, 0, c
  );
}

float random(vec2 pos) {
  return fract(sin(dot(pos.xy, vec2(13.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 pos) {
  vec2 i = floor(pos);
  vec2 f = fract(pos);
  float a = random(i + vec2(0.0, 0.0));
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 pos) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < NUM_OCTAVES; i++) {
    float dir = mod(float(i), 2.0) > 0.5 ? 1.0 : -1.0;
    v += a * noise(pos - 0.05 * dir * time);
    pos = rot * pos * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

bool space_color(vec2 vv, out vec4 color) {
  vec2 p = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
  float t = 0.0, d;
  float time2 = 1.0;
  vec2 q = vec2(0.0);
  q.x = fbm(p + 0.00 * time2);
  q.y = fbm(p + vec2(1.0));
  vec2 r = vec2(0.0);
  r.x = fbm(p + 1.0 * q + vec2(1.7, 1.2) + 0.15 * time2);
  r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + 0.126 * time2);
  float f = fbm(p + r);
  vec3 col = mix( vec3(1.0, 1.0, 2.0), vec3(1.0, 1.0, 1.0), clamp((f * f) * 5.5, 1.2, 15.5));
  col = mix( col, vec3(1.0, 1.0, 1.0), clamp(length(q), 2.0, 2.0) );
  col = mix( col, vec3(0.3, 0.2, 1.0), clamp(length(r.x), 0.0, 5.0) );
  col = (f * f * f * 1.0 + 0.5 * 1.7 * 0.0 + 0.9 * f) * col;
  color = vec4(col, 1.0);
  return true;
}

#define easy_block
// 6
bool space_color(vec2 vv, out vec4 color) {
  vec2 p = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
  color = vec4(vv.x, vv.y, 0.0, 1.0);
  return true;
}


`
