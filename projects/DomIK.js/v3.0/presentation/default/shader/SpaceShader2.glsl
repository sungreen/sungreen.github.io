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
