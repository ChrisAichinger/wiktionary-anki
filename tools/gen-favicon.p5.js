PI = Math.PI;
TWO_PI = 2 * Math.PI;
FILL_CUTOFF = 64;

(function() {
  for (let size of [16, 32, 64, 128, 256]) {
    const width = size;
    const height = size;
    const s = ( sketch ) => {
      sketch.setup = () => {
        sketch.createCanvas(size, size);
        sketch.noLoop();
      };

      sketch.draw = () => {
        sketch.fill(32)
        sketch.noStroke();
        sketch.rect(0, 0, width, height, width*0.15);
        sketch.noFill();

        sketch.push();
        sketch.translate(width*0.6, height * 0.40);
        sketch.stroke("#00bcff")
        sketch.strokeWeight(width*0.07);
        if (size <= FILL_CUTOFF) {
          sketch.fill("#00bcff");
          sketch.strokeWeight(width*0.01);
        }
        const points = drawPentagram(sketch, width*0.4, width/256*10, TWO_PI * 25 / 360);
        if (size <= FILL_CUTOFF) {
          sketch.beginShape();
          for (let p of points) {
            sketch.vertex(p.x, p.y);
          }
          sketch.endShape();
        }
        sketch.pop();

        const wsize = width * 0.6;
        const aspect = 3/4;
        sketch.push();
        sketch.translate(width*0.1, height*0.5);
        sketch.strokeWeight(wsize*0.15);
        sketch.stroke("White")
        drawW(sketch, wsize, wsize * aspect);
        sketch.pop();

        sketch.saveCanvas(`favicon-${width}x${height}`, "png");
      };
    };
    let myp5 = new p5(s);
  }
})()

function drawW(sketch, width, height) {
  sketch.push();
  sketch.strokeJoin(sketch.BEVEL);
  sketch.strokeCap(sketch.PROJECT);
  sketch.clip(() => sketch.rect(-width, 0, 3* width, 3 * height));

  sketch.beginShape();
  sketch.vertex(0, 0);
  sketch.vertex(width/4, height);
  sketch.vertex(width/2, 0);
  sketch.vertex(width*3/4, height);
  sketch.vertex(width, 0);
  sketch.endShape();
  sketch.pop();
}

function drawPentagram(sketch, R, r, angle=0) {
  const points = [];
  for (let i = 0; i < 5; i++) {
    const alpha = TWO_PI * i / 5 + angle;
    points.push(new p5.Vector(R * Math.sin(alpha), R * Math.cos(alpha)));
  }
  sketch.push();
  const arcs = [];
  for (let i=0; i < 5; i++) {
    const l1t = p5.Vector.sub(points[i], points[(i+2)%5]);
    const l2t = p5.Vector.sub(points[i], points[(i+3)%5]).mult(-1);
    const resTip = findTangentCircle(points[i], l2t, points[i], l1t, r);
    sketch.arc(resTip.center.x, resTip.center.y, 2*r, 2*r, resTip.endAngle, resTip.startAngle);

    const l1m = p5.Vector.sub(points[i], points[(i+2)%5]).mult(-1);
    const l2m = p5.Vector.sub(points[(i+4)%5], points[(i+1)%5]).mult(-1);
    const resMid = findTangentCircle(points[i], l1m, points[(i+4)%5], l2m, r);
    sketch.arc(resMid.center.x, resMid.center.y, 2*r, 2*r, resMid.startAngle, resMid.endAngle, sketch.OPEN);
    arcs.push({tip: resTip, mid: resMid});
  }
  let linePoints = [];
  for (let i=0; i < 5; i++) {
    const lastMid = arcs[(i+4)%5].mid;
    const {tip, mid} = arcs[i];
    linePoints = [...linePoints, lastMid.tangentPoint2, tip.tangentPoint1, tip.tangentPoint2, mid.tangentPoint1];
    sketch.line(lastMid.tangentPoint2.x, lastMid.tangentPoint2.y, tip.tangentPoint1.x, tip.tangentPoint1.y);
    sketch.line(tip.tangentPoint2.x, tip.tangentPoint2.y, mid.tangentPoint1.x, mid.tangentPoint1.y)
  }
  sketch.pop();
  return linePoints;
}

// Each line is defined by a point and a direction vector
function findTangentCircle(p1, dir1, p2, dir2, r) {
  dir1.normalize();
  dir2.normalize();

  let angle = Math.acos(dir1.dot(dir2));
  if (Math.abs(angle) < 0.001 || Math.abs(angle - PI) < 0.001) {
    return null;
  }

  const perp1 = new p5.Vector(-dir1.y, dir1.x);
  const perp2 = new p5.Vector(-dir2.y, dir2.x);

  // The circle center will be r units away from each line along their perpendicular vectors
  const offset1 = p5.Vector.mult(perp1, r);
  const offset2 = p5.Vector.mult(perp2, r);

  // To find intersection, solve:
  // p1 + offset1 + t * dir1 = p2 + offset2 + s * dir2
  const p1_offset = p5.Vector.add(p1, offset1);
  const p2_offset = p5.Vector.add(p2, offset2);
  const dp = p5.Vector.sub(p2_offset, p1_offset);
  const t = (dir2.y * dp.x - dir2.x * dp.y) / (dir1.x*dir2.y - dir1.y*dir2.x)
  const center = p5.Vector.add(p1_offset, p5.Vector.mult(dir1, t));

  // Calculate tangent points
  const tangent1 = p5.Vector.add(center, p5.Vector.mult(perp1, -r));
  const tangent2 = p5.Vector.add(center, p5.Vector.mult(perp2, -r));

  // Calculate angles for the arc
  let angle1 = Math.atan2(tangent1.y - center.y, tangent1.x - center.x);
  let angle2 = Math.atan2(tangent2.y - center.y, tangent2.x - center.x);
  if (Math.abs(angle2 - angle1) > PI) { // Ensure we get the shorter arc
    if (angle1 < angle2) {
      angle1 += TWO_PI;
    } else {
      angle2 += TWO_PI;
    }
  }

  return {
    center: center,
    tangentPoint1: tangent1,
    tangentPoint2: tangent2,
    startAngle: angle1,
    endAngle: angle2
  };
}
