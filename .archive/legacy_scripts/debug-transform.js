function getTransformAngle(el) {
  const st = window.getComputedStyle(el);
  const tr = st.getPropertyValue("transform");
  if (tr === "none") return 0;
  const values = tr.split('(')[1].split(')')[0].split(',');
  const a = values[0];
  const b = values[1];
  const angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
  return angle;
}
