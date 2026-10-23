let numElements = 1200;
let diagramMode = false;
let intersectionMarkerDiameterDivisor = 6; // Diameter = overlap depth / this divisor.
let pixelDepositDensity = 0.003; // Expected deposits per pixel of circle area, per frame at full activity.
let intersectionSmearRadiusScale = 3.0; // Brush radius = overlap-derived marker radius * this scale.
let intersectionSmearDistanceScale = 4.0; // Amplify the crossing point's movement to drag existing pixels.
let intersectionSmearMaxDistance = 48; // Maximum drag distance per frame, in canvas pixels.
let intersectionSmearStrength = 0.99; // Fraction of brush pixels affected at full activity (0 to 1).

let drawColor = true;

// Choose one rendering style per type. Changes affect future marks, not accumulated history.
// true = pixel deposits (plus intersection smearing for types 3, 4, and 6).
// false = the original drawing method listed alongside each type.
let usePixelRenderingByType = {
  1: false, // false: drawPerimeter()
  2: false, // false: drawAngle()
  3: true, // false: drawIntersectionMarkers() -- pale circular markers
  4: true, // false: drawIntersectionMarkers() -- source-color circular markers
  5: false, // false: drawFuzzyCenter()
  6: false, // false: drawIntersectionMarkers() -- source-color circular markers
  7: false  // false: drawCenter()
};
// Rendering only: circle movement, growth, and collision radii are unchanged.
// radiusScale controls the deposition field's radius (and diameter).
// densityScale multiplies deposits per unit area, not the size of each pixel.
let typeDepositSettings = {
  1: { radiusScale: 0.25, densityScale: 0.5 }, // Small, sparse.
  2: { radiusScale: 0.25, densityScale: 3.0 }, // Small, dense.
  3: { radiusScale: 0.60, densityScale: 0.5 }, // Medium, sparse.
  4: { radiusScale: 0.60, densityScale: 3.0 }, // Medium, dense.
  5: { radiusScale: 1.00, densityScale: 0.5 }, // Large, sparse.
  6: { radiusScale: 1.00, densityScale: 3.0 }, // Large, dense.
  7: { radiusScale: 0.80, densityScale: 1.0 }  // Broad, moderate.
};
let depositLayer;
let minRadius = 24;
let maxRadius = 44;
let img1, img2;
let elements;
let spatialGrid = new Map();
let spatialGridBucketPool = [];
let gridCellSize = maxRadius * 2 + 2;
let refreshIndex = 0;
let cblack, cwhite, cred, cgreen, cblue, cyellow, cteal;

function preload() {
  img1 = loadImage("data/sketch-09-test-card-02-posterized-02-small.gif");
  img2 = loadImage("data/sketch-09-color-dull.png");
}

function setup() {
  pixelDensity(1);
  createCanvas(1800, 900);
  //createCanvas(windowWidth, windowHeight);
  //noSmooth();
  depositLayer = createGraphics(width, height);
  depositLayer.pixelDensity(1);
  depositLayer.noSmooth();
  depositLayer.clear();
  // Reuse this array while rendering pixels only; refresh it after original canvas drawing.
  depositLayer.loadPixels();
  cblack = color(0, 0, 0);
  cwhite = color(255, 255, 255);
  cred = color(255, 0, 0);
  cgreen = color(0, 255, 0);
  cblue = color(0, 0, 255);
  cyellow = color(255, 255, 0);
  cteal = color(0, 255, 255);
  frameRate(60);
  noCursor();
  elements = [];
  if (diagramMode) {
    background(0);
  } else {
    background(240, 240, 240);
  }
  refreshIndex = 0;
  addElement();
}

function addElement() {
  let nx = random(0, width);
  let ny = random(0, height);
  elements.push(new E3(
    elements.length,
    elements
  ));
}

function draw() {
  if (elements.length < numElements && frameCount % 2 == 0) {
    addElement();
  }

  // Cache the growing radii before collision and deposition work.
  let now = millis();
  for (let element of elements) {
    element.updateCurrentRadius(now);
  }

  rebuildSpatialGrid();
  for (let i = 0; i < elements.length; i++) {
    elements[i].check();
  }

  // Draw the original primitives into the same persistent layer as the pixels.
  let originalDrawingOccurred = false;
  for (let element of elements) {
    if (!element.destroyed && !element.usesPixelRendering()) {
      element.drawOriginal();
      originalDrawingOccurred = true;
    }
  }
  if (originalDrawingOccurred) {
    // Capture the canvas marks before direct pixel writes or updatePixels() would overwrite them.
    depositLayer.loadPixels();
  }

  // Deposit pixels only for types whose switch is true.
  for (let element of elements) {
    element.depositPixels();
  }
  if (intersectionSmearStrength > 0 && elements.some(element =>
    !element.destroyed && element.usesPixelRendering() && element.intersectionMarkers.size > 0)) {
    // All brushes read the same snapshot, avoiding cascading in-place copies.
    let smearSourcePixels = depositLayer.pixels.slice();
    for (let element of elements) {
      element.smearIntersectionPixels(smearSourcePixels);
    }
  }

  // Upload once per frame. Nothing clears or fades the accumulated pixels.
  depositLayer.updatePixels();
  background(diagramMode ? 102 : 240);
  image(depositLayer, 0, 0);

  if (diagramMode) {
    for (let element of elements) {
      element.drawDiagramCircle();
      element.drawIntersectionMarkers();
    }
    image(img1, 50, 50, 300, 150);
    image(img2, 50, 220, 300, 150);
  }

  if (!drawColor) {
    filter(GRAY);
  }
}

function rebuildSpatialGrid() {
  // Release the previous frame's buckets while retaining their arrays.
  for (let bucket of spatialGrid.values()) {
    bucket.length = 0;
    spatialGridBucketPool.push(bucket);
  }
  spatialGrid.clear();

  for (let element of elements) {
    if (element.destroyed) {
      continue;
    }

    let cellX = floor(element.getCenterX() / gridCellSize);
    let cellY = floor(element.getCenterY() / gridCellSize);
    let cellKey = cellX + "," + cellY;
    let bucket = spatialGrid.get(cellKey);
    if (!bucket) {
      bucket = spatialGridBucketPool.pop() || [];
      spatialGrid.set(cellKey, bucket);
    }

    bucket.push(element);
  }
}

function keyPressed() {
  if (key === 'd' || key === 'D') {
    diagramMode = !diagramMode;
    // Diagram overlays never modify or clear depositLayer.
  }

  if (key === 'c' || key === 'C') {
    drawColor = !drawColor;
  }

  if (key === ' ') {
    saveCanvas("HEK-09-04-" + nf(frameCount, 6), "png");
  }
}

class E3 {
  static INITIAL_ALPHA = 60.0;
  static MIN_LIFESPAN_SECONDS = 10;
  static MAX_LIFESPAN_SECONDS = 40;
  static REFERENCE_FRAME_RATE = 30;
  static FRAME_RATE = 60;
  static GROWTH_SECONDS = 6.0;
  static DIAGRAM_FADE_SECONDS = 0.5; // Fade diagram outline during the final half-second of life.

  constructor(num, elements) {
    this.alpha = 0;
    this.destroyed = false;
    this.dying = false;
    // Location and radius set in birth()
    this.x = this.newx = 0;
    this.y = this.newy = 0;
    this.r = 0;
    this.id = num;
    this.others = elements;
    this.elementcolor;
    this.elementr;
    this.elementg;
    this.elementb;
    this.inc = 1.0;
    this.type = 0;
    this.intersectionMarkers = new Map();
    this.birth();
  }

  birth() {
    // Reset all state belonging to the previous life.
    this.intersectionMarkers.clear();
    for (let other of this.others) {
      other.intersectionMarkers.delete(this.id);
    }

    this.over = 0;
    this.defaultColor = random(0, 1);
    this.angle = random(0, TWO_PI);
    this.birthTime = millis();
    this.setRadius(random(minRadius, maxRadius));
    this.dying = false;
    this.destroyed = false;
    this.lifespanSeconds = random(E3.MIN_LIFESPAN_SECONDS, E3.MAX_LIFESPAN_SECONDS);
    this.DECAY_MULTIPLIER = E3.INITIAL_ALPHA / (this.lifespanSeconds * E3.FRAME_RATE);
    this.alpha = E3.INITIAL_ALPHA;
    this.x = this.newx = random(0, width);
    this.y = this.newy = random(0, height);
    let colorfalse = img1.get(this.x, this.y);
    let colorreal = img2.get(this.x, this.y);
    this.color = colorfalse;
    this.colorreal = undefined;

    // 50% Chance to pick a random color not associated with the current position in img2.
    if (random(0, 1) < 0.5) {
      colorreal = img2.get(random(0, width), random(0, height));
    }

    this.elementcolor = colorreal;
    this.elementr = this.elementcolor[0];
    this.elementg = this.elementcolor[1];
    this.elementb = this.elementcolor[2];
    if ([cred].some(target =>
      this.color[0] === target.levels[0] &&
      this.color[1] === target.levels[1] &&
      this.color[2] === target.levels[2])) {
      this.type = 1; //1; //2;
    } else if ([cgreen].some(target =>
      this.color[0] === target.levels[0] &&
      this.color[1] === target.levels[1] &&
      this.color[2] === target.levels[2])) {
      this.type = 2; //2; //3;
    } else if ([cblue].some(target =>
      this.color[0] === target.levels[0] &&
      this.color[1] === target.levels[1] &&
      this.color[2] === target.levels[2])) {
      this.type = 3; //3; //1;
    } else if ([cblack].some(target =>
      this.color[0] === target.levels[0] &&
      this.color[1] === target.levels[1] &&
      this.color[2] === target.levels[2])) {
      this.type = 4; //3; //1;
    } else if ([cteal].some(target =>
      this.color[0] === target.levels[0] &&
      this.color[1] === target.levels[1] &&
      this.color[2] === target.levels[2])) {
      this.type = 5; //4; //2;
    } else if ([cyellow].some(target =>
      this.color[0] === target.levels[0] &&
      this.color[1] === target.levels[1] &&
      this.color[2] === target.levels[2])) {
      this.type = 6; //4; //2;
    } else { // White or other colors
      this.type = 7;
    }
  }

  death() {
    this.dying = true;
  }

  getCenterX() {
    return this.newx;
  }

  getCenterY() {
    return this.newy;
  }

  setRadius(rin) {
    this.r = rin; // Target radius for this life.
    this.currentRadius = 1;
    this.cellwidth = 2;
  }

  updateCurrentRadius(now) {
    let progress = constrain((now - this.birthTime) / (E3.GROWTH_SECONDS * 1000), 0, 1);
    // Cubic ease-out: growth slows smoothly to a stop at the target radius.
    let easedProgress = 1 - (1 - progress) ** 3;
    this.currentRadius = 1 + (this.r - 1) * easedProgress;
    this.cellwidth = this.currentRadius * 2;
  }

  move(a, r) {
    this.newx = this.newx + cos(a)*r;
    this.newy = this.newy + sin(a)*r;
  }

  check() {
    let frameScale = E3.REFERENCE_FRAME_RATE / E3.FRAME_RATE;

    if (this.destroyed) {
      this.birth();
    }

    this.alpha = max(this.alpha - this.DECAY_MULTIPLIER, 0);
    if (this.alpha <= 0) {
      this.death();
      this.destroyed = true;
      return;
    }

    // Increase the angle when touching another circle
    // Increment position with numbers between -1 and 1
    // Modulate the speed based on size of circle
    this.newx += cos(this.angle) * frameScale;
    this.newy += sin(this.angle) * frameScale;
    // Interpolate X
    let tempx = this.newx - this.x;
    if (abs(tempx) > 0.1) {
      this.x += tempx/80.0;
    }

    // Interpolate Y
    let tempy = this.newy - this.y;
    if (abs(tempy) > 0.1) {
      this.y += tempy/80.0;
    }

    this.over = 0;
    for (let marker of this.intersectionMarkers.values()) {
      marker.active = false;
    }

    let cellX = floor(this.getCenterX() / gridCellSize);
    let cellY = floor(this.getCenterY() / gridCellSize);
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        let cellKey = (cellX + offsetX) + "," + (cellY + offsetY);
        let cellElements = spatialGrid.get(cellKey);
        if (!cellElements) {
          continue;
        }

        for (let other of cellElements) {
          if (other.id != this.id && !other.destroyed) {
            let dx = other.getCenterX() - this.getCenterX();
            let dy = other.getCenterY() - this.getCenterY();
            let rerr = other.cellwidth/2 + this.cellwidth/2 + 1.0;
            let rr = other.cellwidth/2 + this.cellwidth/2;
            let diff = dx*dx + dy*dy;
            // If overlap
            if (diff < (rr*rr)) {
              let rA = atan2(dy, dx);
              other.move(rA, this.inc * frameScale);
              this.move(rA + PI, this.inc * frameScale);
              // if (this.type == 5) {
              //   strokeWeight(1);
              //   let tempd = dist(this.x, this.y, other.x, other.y);
              //   let gray = map(tempd, minRadius*2, maxRadius*2, 0, 255);
              //   //stroke(gray, gray, gray, this.alpha/2);
              //   stroke(this.elementr, this.elementg, this.elementb, this.alpha/2);
              //   line(this.x, this.y, other.x, other.y);
              // }
            }

            if (diff < rerr*rerr) {
              this.over++; // Count the number of elements touching
              if (this.over > 3) {
                this.over = 3;
              }
            }

            if (this.ownsIntersectionMarkers(other)) {
              this.updateIntersectionMarker(other);
            }
          }
        }
      }
    }

    for (let [otherId, marker] of this.intersectionMarkers) {
      if (!marker.active) {
        this.intersectionMarkers.delete(otherId);
      }
    }

    // Turn if touching another
    if (this.over > 0) {
      let inc = this.over * ((1.0-(this.currentRadius/70.0)) / 6.0);
      this.angle += (inc / 20.0) * frameScale; // New 11 Sep 2026 to turn less when touching more than one
    }
  }

  updateIntersectionMarker(other) {
    // Geometry follows the visible circles, independently of collision positions.
    let dx = other.x - this.x;
    let dy = other.y - this.y;
    let distanceSquared = dx * dx + dy * dy;
    let radius = this.currentRadius;
    let otherRadius = other.currentRadius;
    let radiusSum = radius + otherRadius;
    let radiusDifference = radius - otherRadius;
    if (distanceSquared >= radiusSum * radiusSum ||
        distanceSquared <= radiusDifference * radiusDifference) {
      return;
    }

    let distance = sqrt(distanceSquared);
    let along = (radius * radius - otherRadius * otherRadius + distance * distance) / (2 * distance);
    let height = sqrt(max(radius * radius - along * along, 0));
    let baseX = this.x + dx * along / distance;
    let baseY = this.y + dy * along / distance;
    let offsetX = -dy * height / distance;
    let offsetY = dx * height / distance;

    let marker = this.intersectionMarkers.get(other.id);
    if (!marker) {
      marker = {
        active: false,
        points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
        previousPoints: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
        initialized: false,
        diameter: 0
      };
      this.intersectionMarkers.set(other.id, marker);
    }

    // Track the crossing points' motion without changing the intersection geometry.
    if (marker.initialized) {
      for (let i = 0; i < marker.points.length; i++) {
        marker.previousPoints[i].x = marker.points[i].x;
        marker.previousPoints[i].y = marker.points[i].y;
      }
    }
    marker.active = true;
    marker.points[0].x = baseX + offsetX;
    marker.points[0].y = baseY + offsetY;
    marker.points[1].x = baseX - offsetX;
    marker.points[1].y = baseY - offsetY;
    if (!marker.initialized) {
      for (let i = 0; i < marker.points.length; i++) {
        marker.previousPoints[i].x = marker.points[i].x;
        marker.previousPoints[i].y = marker.points[i].y;
      }
      marker.initialized = true;
    }
    let overlapDepth = radiusSum - distance;
    marker.diameter = overlapDepth / intersectionMarkerDiameterDivisor;
  }

  canDrawIntersectionMarkers() {
    return this.type == 3 || this.type == 4 || this.type == 6;
  }

  ownsIntersectionMarkers(other) {
    // An eligible participant owns the pair and selects its rendering style; ID breaks ties.
    return this.canDrawIntersectionMarkers() &&
      (!other.canDrawIntersectionMarkers() || this.id < other.id);
  }

  usesPixelRendering() {
    return usePixelRenderingByType[this.type];
  }

  drawOriginal() {
    if (this.destroyed || this.alpha <= 0 || this.usesPixelRendering()) {
      return;
    }

    depositLayer.push();
    switch (this.type) {
      case 1:
        this.drawPerimeter();
        break;
      case 2:
        this.drawAngle();
        break;
      case 3:
      case 4:
      case 6:
        this.drawIntersectionMarkers(depositLayer);
        break;
      case 5:
        //this.drawFuzzyCenter();
        this.drawPerimeter();
        break;
      case 7:
        this.drawCenter();
        break;
    }
    depositLayer.pop();
  }

  depositPixels() {
    if (this.destroyed || this.alpha <= 0 || !this.usesPixelRendering()) {
      return;
    }

    let activity = constrain(this.alpha / E3.INITIAL_ALPHA, 0, 1);
    let settings = typeDepositSettings[this.type];
    this.depositPixelBurst(this.x, this.y, this.currentRadius * settings.radiusScale,
      pixelDepositDensity * settings.densityScale, activity);
  }

  smearIntersectionPixels(sourcePixels) {
    if (this.destroyed || this.alpha <= 0 || !this.canDrawIntersectionMarkers() ||
        !this.usesPixelRendering() || intersectionSmearStrength <= 0) {
      return;
    }

    for (let [otherId, marker] of this.intersectionMarkers) {
      let other = this.others[otherId];
      if (!marker.active || marker.diameter <= 0 || !other || other.destroyed) {
        continue;
      }

      let activity = constrain(min(this.alpha, other.alpha) / E3.INITIAL_ALPHA, 0, 1);
      let radius = marker.diameter * intersectionSmearRadiusScale / 2;
      let strength = constrain(intersectionSmearStrength * activity, 0, 1);
      for (let i = 0; i < marker.points.length; i++) {
        let point = marker.points[i];
        let previousPoint = marker.previousPoints[i];
        this.smearPixelRegion(sourcePixels, point.x, point.y, radius,
          point.x - previousPoint.x, point.y - previousPoint.y, strength);
      }
    }
  }

  smearPixelRegion(sourcePixels, centerX, centerY, radius, motionX, motionY, strength) {
    let motionLength = sqrt(motionX * motionX + motionY * motionY);
    if (radius <= 0 || strength <= 0 || motionLength <= 0 ||
        intersectionSmearDistanceScale <= 0 || intersectionSmearMaxDistance <= 0) {
      return;
    }

    let distance = min(max(motionLength * intersectionSmearDistanceScale, 1),
      intersectionSmearMaxDistance);
    let offsetX = Math.round(motionX / motionLength * distance);
    let offsetY = Math.round(motionY / motionLength * distance);
    if (offsetX === 0 && offsetY === 0) {
      return;
    }

    let layerWidth = depositLayer.width;
    let layerHeight = depositLayer.height;
    let minX = max(0, floor(centerX - radius));
    let maxX = min(layerWidth - 1, Math.ceil(centerX + radius));
    let minY = max(0, floor(centerY - radius));
    let maxY = min(layerHeight - 1, Math.ceil(centerY + radius));
    let radiusSquared = radius * radius;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Test pixel centers, retaining the circular brush without fractional coverage.
        let dx = x + 0.5 - centerX;
        let dy = y + 0.5 - centerY;
        if (dx * dx + dy * dy > radiusSquared) {
          continue;
        }
        let sourceX = x - offsetX;
        let sourceY = y - offsetY;
        if (sourceX < 0 || sourceX >= layerWidth || sourceY < 0 || sourceY >= layerHeight) {
          continue;
        }
        let sourceIndex = 4 * (sourceY * layerWidth + sourceX);
        // Empty source pixels carry no paint: never manufacture color or erase a deposit.
        if (sourcePixels[sourceIndex + 3] === 0 || Math.random() >= strength) {
          continue;
        }
        let targetIndex = 4 * (y * layerWidth + x);
        depositLayer.pixels[targetIndex] = sourcePixels[sourceIndex];
        depositLayer.pixels[targetIndex + 1] = sourcePixels[sourceIndex + 1];
        depositLayer.pixels[targetIndex + 2] = sourcePixels[sourceIndex + 2];
        depositLayer.pixels[targetIndex + 3] = sourcePixels[sourceIndex + 3];
      }
    }
  }

  depositPixelBurst(centerX, centerY, radius, density, activity) {
    let expectedCount = PI * radius * radius * density * activity;
    if (expectedCount <= 0) {
      return;
    }

    // Probabilistic rounding keeps small, slowly growing fields active too.
    // A separate random stream keeps rendering from consuming p5's simulation RNG.
    let count = floor(expectedCount);
    if (Math.random() < expectedCount - count) {
      count++;
    }

    for (let i = 0; i < count; i++) {
      let position = this.sampleDepositPosition(centerX, centerY, radius);
      this.depositPixel(position.x, position.y);
    }
  }

  sampleDepositPosition(centerX, centerY, radius) {
    let angle = Math.random() * TWO_PI;
    // sqrt gives uniform density over area, rather than clustering at the center.
    let distance = radius * sqrt(Math.random());
    return {
      x: floor(centerX + cos(angle) * distance),
      y: floor(centerY + sin(angle) * distance)
    };
  }

  depositPixel(x, y) {
    if (x < 0 || x >= depositLayer.width || y < 0 || y >= depositLayer.height) {
      return;
    }

    let index = 4 * (y * depositLayer.width + x);
    depositLayer.pixels[index] = this.elementr;
    depositLayer.pixels[index + 1] = this.elementg;
    depositLayer.pixels[index + 2] = this.elementb;
    depositLayer.pixels[index + 3] = 255;
  }

  // A target draws original markers into the accumulation layer; no target draws diagram overlays.
  drawIntersectionMarkers(target = null) {
    if ((!target && !diagramMode) || this.destroyed) {
      return;
    }
    // if (this.type == 4) {
    //   return;
    // }
    if (this.canDrawIntersectionMarkers()) {
      let renderer = target || globalThis;
      renderer.noStroke();
      for (let [otherId, marker] of this.intersectionMarkers) {
        if (!marker.active || marker.diameter <= 0) {
          continue;
        }

        let other = this.others[otherId];
        if (!other || other.destroyed) {
          continue;
        }
        let markerAlpha = min(min(this.alpha, other ? other.alpha : this.alpha) * 1.25, 255);
        let diameter = marker.diameter;

        if (!target) {
          markerAlpha = 255;
        }

        renderer.fill(this.elementr, this.elementg, this.elementb, markerAlpha);
        if (this.type == 3) {
          renderer.fill(240, 240, 240, markerAlpha);
        }

        for (let point of marker.points) {
          renderer.ellipse(point.x, point.y, diameter, diameter);
        }
      }
    }
  }

  drawDiagramCircle() {
    if (this.destroyed) {
      return;
    }

    //push();
    noFill();
    strokeWeight(1);
    //stroke(76);
    // Match the fade countdown to the same frame-based alpha decay that triggers death().
    let framesUntilDeath = this.alpha / this.DECAY_MULTIPLIER;
    let fadeFrames = E3.DIAGRAM_FADE_SECONDS * E3.FRAME_RATE;
    let outlineFade = constrain(framesUntilDeath / fadeFrames, 0, 1);
    stroke(this.color[0], this.color[1], this.color[2], 102 * outlineFade);
    let diameter = this.currentRadius * 2;
    ellipse(this.x, this.y, diameter, diameter);
    // Match the heading used by the element's movement.
    let edgeX = this.x + cos(this.angle) * this.currentRadius;
    let edgeY = this.y + sin(this.angle) * this.currentRadius;
    line(this.x, this.y, edgeX, edgeY);
    //pop();
  }

  drawCenter(target = depositLayer){
    // Normal artwork styling stays independent of the diagram overlay.
    target.strokeWeight(1.0);
    target.stroke(240, 240, 240, this.alpha*4);
    target.point(this.x, this.y);
  }

  drawFuzzyCenter(target = depositLayer){
    target.strokeWeight(1.0);
    target.stroke(this.elementr, this.elementg, this.elementb, this.alpha*4);
    //stroke(240, 240, 240, this.alpha*4);
    // Rendering randomness must not change the simulation's p5 random sequence.
    target.point(this.x + Math.random()*10 - 5, this.y + Math.random()*10 - 5);
  }

  drawPerimeter(target = depositLayer){
    target.strokeWeight(1);
    //stroke(226, this.alpha*0.5);
    target.stroke(this.elementr, this.elementg, this.elementb, this.alpha*0.9);
    target.noFill();
    target.ellipse(this.x, this.y, this.currentRadius, this.currentRadius);
  }

  drawAngle(target = depositLayer){
    //target.noStroke();
    target.stroke(this.elementr, this.elementg, this.elementb, this.alpha);
    let nx = this.x + cos(this.angle) * this.currentRadius;
    let ny = this.y + sin(this.angle) * this.currentRadius;
    target.line(this.x, this.y, nx, ny);
    //target.ellipse(nx, ny, 1.5, 1.5);
  }
}
