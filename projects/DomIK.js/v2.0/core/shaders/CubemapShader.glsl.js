export default /* glsl */`

#define M_PI 3.1415926535897932384626433832795

uniform sampler2D u_image;
uniform sampler2D u_skin;

uniform float u_factor;
uniform float u_rotate;
uniform float u_time;

uniform vec2 u_mouse;
uniform vec2 u_resolution;

varying vec2 v_uv;

void main() {
  vec4 color = vec4( 0.0, 0.0, 0.0, 1.0);
  float xr = (2.0*v_uv.x - 1.0);
  float yr = (2.0*v_uv.y - 1.0);
  float r = sqrt( xr*xr+yr*yr );

  if ( r<=1.0 ) {
    float a = (atan( yr, -xr)-M_PI/2.0)+M_PI*u_rotate;
    float b = u_factor*M_PI*r;

    float dy = cos( b );
    float dx = sin( b )*sin( a );
    float dz = sin( b )*cos( a );
 
    float mx = 2.0*abs( dx );
    float my = 2.0*abs( dy );
    float mz = 2.0*abs( dz );

    float x;
    float y;
    float z;

    if( mx>my && mx>mz ) {
      dx = dx / mx;
      dy = dy / mx;
      dz = dz / mx;
      if( dx>0.0 ) {
        x = (dy+0.5+1.0)/3.0;
        y = (dz+0.5+0.0)/2.0;
      } else {
        x = (dz+0.5+1.0)/3.0;
        y = (dy+0.5+1.0)/2.0;
      }
    } else {
      if( mz>mx && mz>my ) {
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

    vec2 r_uv = vec2( x, y );
    color = texture2D(u_image, r_uv);
  }
  gl_FragColor = color;
  // gl_FragColor = vec4( u_mouse.x, u_mouse.y, 0.0, 1.0 );
}
`;
