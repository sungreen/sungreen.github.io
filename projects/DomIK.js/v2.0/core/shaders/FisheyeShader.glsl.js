export default /* glsl */`

#define M_PI 3.1415926535897932384626433832795

uniform sampler2D u_image;
uniform float u_factor;
uniform float u_rotate;

varying vec2 v_uv;

void main() {
  vec4 color = vec4( 0.0, 0.0, 0.0, 1.0);
  float x = 2.0*v_uv.x - 1.0;
  float y = 2.0*v_uv.y - 1.0;
  float r = u_factor*sqrt( x*x+y*y );

  if ( r<=1.0 )
  { 
    float a = atan( y, -x)+M_PI*(1.0+u_rotate);
    float xf = (-r*sin(a)+1.0)/2.0;
    float yf = (r*cos(a)+1.0)/2.0;
    vec2 r_uv = vec2( xf, yf );
    color = texture2D(u_image, r_uv);
  }
  gl_FragColor = color;
}
`;