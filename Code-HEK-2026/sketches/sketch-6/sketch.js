let numElements = 600;
let diagramMode = true;
let intersectionMarkerDiameterDivisor = 6; // Diameter = overlap depth / this divisor.
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
  img1 = loadImage("data/sketch-07-01-1800x900-posterized.gif");
  img2 = loadImage("data/sketch-07-01-color.png");
}

function setup() {
  createCanvas(1800, 900);
  //createCanvas(windowWidth, windowHeight);
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
  if (diagramMode) {
    background(102);
  }

  if (elements.length < numElements && frameCount % 2 == 0) {
    addElement();
  }

  // Cache the growing radii before collision and drawing work.
  let now = millis();
  for (let element of elements) {
    element.updateCurrentRadius(now);
  }

  rebuildSpatialGrid();
  if (diagramMode) {
    for (let element of elements) {
      element.drawDiagramCircle();
    }
  }

  for (let i = 0; i < elements.length; i++) {
    elements[i].check();
  }

  for (let i = 0; i < elements.length; i++) {
    elements[i].drawIntersectionMarkers();
  }

  if (diagramMode) {
    image(img1, 50, 50, 300, 150);
    image(img2, 50, 220, 300, 150);
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
    // Start the selected rendering mode on its own background.
    if (diagramMode) {
      background(0);
    } else {
      background(240, 240, 240);
    }
  }

  if (key === ' ') {
    saveCanvas("HEK-07-04-" + nf(frameCount, 6), "png");
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

    // 33% Chance to pick a random color not associated with the current position in img2.
    if (random(0, 1) < 0.33) {
      this.colorreal = img2.get(random(0, width), random(0, height));
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

    if (this.type == 1) {
      this.drawPerimeter();
    } else if (this.type == 2) {
      this.drawAngle();
    } else if (this.type == 3) {
      //this.drawCenter();  // Maybe On?
    } else if (this.type == 4) {
      //this.drawCenter();  // Maybe On?
    } else if (this.type == 5) {
      this.drawFuzzyCenter();
    } else if (this.type == 6) {
      //this.drawCenter(); // Maybe On?
    } else if (this.type == 7) {
      this.drawCenter();
    }

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
        diameter: 0
      };
      this.intersectionMarkers.set(other.id, marker);
    }

    marker.active = true;
    marker.points[0].x = baseX + offsetX;
    marker.points[0].y = baseY + offsetY;
    marker.points[1].x = baseX - offsetX;
    marker.points[1].y = baseY - offsetY;
    let overlapDepth = radiusSum - distance;
    marker.diameter = overlapDepth / intersectionMarkerDiameterDivisor;
  }

  canDrawIntersectionMarkers() {
    return this.type == 3 || this.type == 4 || this.type == 6;
  }

  ownsIntersectionMarkers(other) {
    // An eligible participant owns the pair; use ID only to break ties.
    return this.canDrawIntersectionMarkers() &&
      (!other.canDrawIntersectionMarkers() || this.id < other.id);
  }

  drawIntersectionMarkers() {
    // if (this.type == 4) {
    //   return;
    // }
    if (this.canDrawIntersectionMarkers()) {
      noStroke();
      for (let [otherId, marker] of this.intersectionMarkers) {
        if (!marker.active || marker.diameter <= 0) {
          continue;
        }

        let other = this.others[otherId];
        let markerAlpha = min(min(this.alpha, other ? other.alpha : this.alpha) * 1.25, 255);
        let diameter = marker.diameter;

        if (diagramMode) {
          markerAlpha = 255;
        }

        fill(this.elementr, this.elementg, this.elementb, markerAlpha);
        if (this.type == 3) {
          fill(240, 240, 240, markerAlpha);
          if (diagramMode) {
            fill(240, 240, 240, 255);
          }
        }

        for (let point of marker.points) {
          ellipse(point.x, point.y, diameter, diameter);
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

  drawCenter(){
    strokeWeight(1.5);
    if (diagramMode) {
      strokeWeight(4);
      stroke(240, 240, 240, 255);
    } else {
      stroke(240, 240, 240, this.alpha*4);
    }

    //stroke(240, 240, 240, this.alpha*4);
    point(this.x, this.y);
  }

  drawFuzzyCenter(){
    strokeWeight(1.0);
    stroke(this.elementr, this.elementg, this.elementb, this.alpha*4);
    //stroke(240, 240, 240, this.alpha*4);
    point(this.x + random(-5, 5), this.y + random(-5, 5));
  }

  drawPerimeter(){
    strokeWeight(1);
    //stroke(226, this.alpha*0.5);
    stroke(this.elementr, this.elementg, this.elementb, this.alpha*0.9);
    noFill();
    ellipse(this.x, this.y, this.currentRadius*0.1, this.currentRadius*0.1);
  }

  drawAngle(){
    noStroke();
    fill(this.elementr, this.elementg, this.elementb, this.alpha);
    let nx = this.x + cos(this.angle) * this.currentRadius;
    let ny = this.y + sin(this.angle) * this.currentRadius;
    ellipse(nx, ny, 1.5, 1.5);
  }
}
