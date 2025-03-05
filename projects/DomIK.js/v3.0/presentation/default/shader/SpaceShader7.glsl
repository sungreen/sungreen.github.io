#define GLSLIFY 1
// Fractal noise from https://github.com/yiwenl/glsl-fbm
// Modified signature to accept num octaves as an optional 2nd parameter

#define NUM_OCTAVES 5

float rand_fbm_1540259130(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
    mix(rand_fbm_1540259130(ip),rand_fbm_1540259130(ip+vec2(1.0,0.0)),u.x),
    mix(rand_fbm_1540259130(ip+vec2(0.0,1.0)),rand_fbm_1540259130(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

float fbm(vec2 x, int numOctaves) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < numOctaves; ++i) {
    v += a * noise(x);
    x = rot * x * 2.0 + shift;
    a *= 0.5;
    }
    return v;
}

float fbm(vec2 x) {
    return fbm(x, NUM_OCTAVES);
}

vec3 blendNormal(vec3 base, vec3 blend) {
	return blend;
}

vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
	return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
}

float blendLighten(float base, float blend) {
	return max(blend,base);
}

vec3 blendLighten(vec3 base, vec3 blend) {
	return vec3(blendLighten(base.r,blend.r),blendLighten(base.g,blend.g),blendLighten(base.b,blend.b));
}

vec3 blendLighten(vec3 base, vec3 blend, float opacity) {
	return (blendLighten(base, blend) * opacity + base * (1.0 - opacity));
}

float blendScreen(float base, float blend) {
	return 1.0-((1.0-base)*(1.0-blend));
}

vec3 blendScreen(vec3 base, vec3 blend) {
	return vec3(blendScreen(base.r,blend.r),blendScreen(base.g,blend.g),blendScreen(base.b,blend.b));
}

vec3 blendScreen(vec3 base, vec3 blend, float opacity) {
	return (blendScreen(base, blend) * opacity + base * (1.0 - opacity));
}


#include <common>
#include <dithering_pars_fragment>

// Cosine based palette, 4 vec3 params
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos( 6.28318*(c*t+d) );
}

bool space_color(vec2 vv, out vec4 color) {
  // INTENSITY CALC
  // bell shape
  float yGrad = 1. - clamp(0., 1., pow(sin(vv.y * 3.14 * 0.5), 1.));
  float fadeIn = 1. /*uOpacity*/;
  float intensity = yGrad * fadeIn;

  // PULSATE?
  float pulsate = intensity * (.3 + sin(time * 2.) * .1);
  intensity = mix(intensity, pulsate, 1. /*uPulsate*/);

  // add mouse+noise to intensity
  vec2 mouseUV = (mouse + 1.) * 0.5;
  float mouseCursor = smoothstep(1./*uCursorRadius*/, 0., distance(vv * vec2(1. /*uAspect*/, 1.), mouse * vec2(1./*uAspect*/, 1.))) * 1./*uVelocity*/;
  float mouseNoise = smoothstep(1./*uCursorRadius*/ * 5., 0., distance(vv * vec2(1. /*uAspect*/, 1.), mouse * vec2(1./*uAspect*/, 1.))) * 1./*uVelocity*/;
  float mouseIntensity = 1. /*(mouseCursor + vNoise1 * pow(mouseNoise, 2.)) * 1./*uCursorStrength*/;
  // dont overpower already intense areas with mouse
  // intensity = mix(intensity + mouseIntensity, intensity, intensity);
// intensity += mouseIntensity * 10.;
vec4 finalColor;

vec4 layer1 = vec4(vec3(1.,0.5,0.3)/*uColor1*/, intensity * pow(sin(vv.x * 3.14), 2.)); 
vec4 layer2 = mix(vec4(0.), vec4(vec3(0.5,0.9,0.6)/*uColor2*/, 1.0), intensity * pow(sin(vv.x * 3.14), 2.)); 
vec4 layer3 = mix(vec4(0.), vec4(vec3(0.3,0.1,0.9)/*uColor3*/, 1.0), intensity * pow(sin(vv.x * 3.14), .5 * 1./*uLandscape*/)); 

float blur = .075;
//float threshold3 = 0.4 * /*(vNoise2 + mouseIntensity)*/;
//float threshold2 = 0.25 /* * (vNoise1 + mouseIntensity)*/;
//float threshold1 = 0.1 * /*(vNoise2 + mouseIntensity)*/;
float threshold3 = 0.4;
float threshold2 = 0.25;
float threshold1 = 0.1;

finalColor = mix(vec4(0.), layer3, smoothstep(threshold3+blur*5., threshold3, vv.y));
finalColor += mix(vec4(0.), layer2, smoothstep(threshold2+blur, threshold2, vv.y));
// finalColor += mix(vec4(0.0), layer1, smoothstep(threshold1+blur, threshold1, vUv.y));

layer1.a *= smoothstep(threshold1+blur, threshold1, vv.y);
float blendOpac = .75 * layer1.a;

finalColor = vec4(blendNormal(finalColor.rgb, layer1.rgb, blendOpac), (blendOpac + finalColor.a) * 1. /*uOpacity*/);

  // MOUSE COLOR
  // Color the mouse differently
  // float cursorMix = smoothstep(0.22, 1.0, intensity * mouseNoise);
  // finalColor.rgb = mix(finalColor.rgb, uCursorColor, cursorMix);

  color = finalColor;

  // enable sRGB output for final color
  // #include <dithering_fragment>
  // #include <tonemapping_fragment>
  // #include <encodings_fragment>
  return true;
}