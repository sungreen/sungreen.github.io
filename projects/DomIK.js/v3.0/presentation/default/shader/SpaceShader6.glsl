bool space_color(vec2 vv, out vec4 color) {
  vec2 p = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
  color = vec4(vv.x, vv.y, 0.0, 1.0);
  return true;
}
