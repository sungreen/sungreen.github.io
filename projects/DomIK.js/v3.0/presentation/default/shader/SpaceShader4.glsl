bool space_color(vec2 vv, out vec4 color) {
  vec2 p = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
  float e = 0.0;
  for (float i=3.0;i<=15.0;i+=1.0) {
    e += 0.007/abs( (i/15.) +sin((time/2.0) + 0.15*i*(p.x) *( cos(i/4.0 + (time / 2.0) + p.x*2.2) ) ) + 2.5*p.y);
    color = vec4( vec3(e/1.6, e/11.6, e/1.6), 1.0);	
  }
  return true;
}
