export default /* glsl */ `
varying vec2 v_uv;
uniform float time;

void main() {
  vec2 uv = v_uv;
  float fx = abs(uv.x*2.0-1.0);
  float fy = abs(uv.y*2.0-1.0);
  float f = (sin(max(fx,fy)*30.0+time*10.0)+1.0)/2.0;
  gl_FragColor = vec4(1.0, 0.2, 0.1, f);
  #include <colorspace_fragment>
}

`