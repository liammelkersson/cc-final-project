//tonejs variables
let player;
let oscillator;
let analyser;
let mic;

//boids variable
const flock = [];

//ml5js handpose variables
let video;
let handpose;
let predictions = [];
let handDetected = false;

//osbticle variables
let obstaclePosition;
let obstacleRadius = 40;

//canvas variables
let canvasWidth = 500; //windowWidth;
let canvasHeight = 500; //windowHeight;

//LOAD
window.addEventListener("load", () => {
  player = new Tone.Player("nikes.mp3");
  oscillator = new Tone.Oscillator(440, "sine").toDestination();

  analyser = new Tone.Analyser("fft", 512);

  mic = new Tone.UserMedia();

  oscillator.connect(analyser);
  oscillator.toDestination();
  player.connect(analyser);
  player.toDestination();
  mic.connect(analyser);
});

//CLICK
window.addEventListener("click", () => {
  player.start();
  for (let i = 0; i < 100; i++) {
    flock.push(createBoid());
  }
});

//SETUP
function setup() {
  createCanvas(canvasWidth, canvasHeight);
  frameRate(80);

  video = createCapture(VIDEO);
  video.size(canvasWidth, canvasHeight);
  video.hide();
  //https://docs.ml5js.org/#/reference/handpose

  handpose = ml5.handpose(video, modelReady);
  handpose.on("predict", (results) => {
    predictions = results;
  });
  // https://editor.p5js.org/LillianBrevik/sketches/8ESd_N0Qh
}

//logging the handpose model
function modelReady() {
  console.log("Handpose model ready!");
}

// DRAW
function draw() {
  background(20, 20, 50, 50);

  let frequencyData = analyser.getValue();

  for (let boid of flock) {
    edge(boid);
    flockBoids(boid, flock);
    updateBoid(boid);

    let frequencyIndex = 100;
    //this limits the frequency to 100
    let frequencyValue = frequencyData[frequencyIndex];

    // COLOR CHANGE BASED ON FRQUENCY
    // boid.color = color(
    //   map(frequencyValue, -100, 0, 0, 255),
    //   random(255),
    //   random(255)
    // );

    // change boid velocity depending on frequency from the song
    let newVelocity = p5.Vector.random2D().setMag(
      map(frequencyValue, -100, 0, 2, 40)
    );
    boid.velocity.lerp(newVelocity, 0.1);

    showBoid(boid);
  }

  drawHand();
}

// CREATE
function createBoid() {
  let behavior = "";
  let behaviorChance = random(1);

  if (behaviorChance < 0.1) {
    behavior = "extrovert";
  } else if (behaviorChance < 0.2) {
    behavior = "introvert";
  } else {
    behavior = "normal"; // neutral behavior
  }

  let boidColor;
  if (behavior === "extrovert") {
    boidColor = color(
      random(200, 255),
      random(200, 255),
      random(0, 10),
      random(2, 150)
    ); // yellow color for extrovert behavior
  } else if (behavior === "introvert") {
    boidColor = color(
      random(240, 255),
      random(240, 255),
      random(240, 255),
      random(2, 150)
    ); // red color for introvert behavior
  } else {
    boidColor = color(random(10), random(255), random(255), random(2, 150));
    // blue and or green color for normal behavior
    //NOTE TO SELF: implement the frquency color change here?
  }

  return {
    position: createVector(random(width), random(height)),
    velocity: p5.Vector.random2D().setMag(random(2, 4)),
    acceleration: createVector(),
    //maxForce and maxSpeed can be adjusted to liking
    maxForce: random(0.2, 0.8),
    maxSpeed: random(2, 6),
    color: boidColor,
    behavior: behavior,
  };
}

// SHOW
function showBoid(b) {
  fill(b.color);
  noStroke();

  let angle = b.velocity.heading() + PI / 2;
  push();
  ellipse(b.position.x, b.position.y, 3);
  pop();
}

// FLOCKING
function flockBoids(b, boids) {
  b.acceleration.set(0, 0);
  let alignment = alignBoid(b, boids);
  let cohesion = cohesionBoids(b, boids);
  let separation = separationBoids(b, boids);
  b.acceleration.add(alignment);
  b.acceleration.add(cohesion);
  b.acceleration.add(separation);

  if (obstaclePosition) {
    let avoidance = avoidObstacle(b, b.behavior);
    b.acceleration.add(avoidance);
  }
}

// UPDATE
function updateBoid(b) {
  b.position.add(b.velocity);
  b.velocity.add(b.acceleration);
  b.velocity.limit(b.maxSpeed);
}

// EDGES OF THE SCREEN
function edge(b) {
  if (b.position.x > width) {
    b.position.x = 0;
  } else if (b.position.x < 0) {
    b.position.x = width;
  }
  if (b.position.y > height) {
    b.position.y = 0;
  } else if (b.position.y < 0) {
    b.position.y = height;
  }
}

// ALIGNMENT
function alignBoid(b, boids) {
  let perceptionRadius = 100;
  let steering = createVector();
  let total = 0;
  for (let other of boids) {
    let d = dist(
      b.position.x,
      b.position.y,
      other.position.x,
      other.position.y
    );
    if (other != b && d < perceptionRadius) {
      steering.add(other.velocity);
      total++;
    }
  }
  if (total > 0) {
    steering.div(total);
    steering.setMag(b.maxSpeed);
    steering.sub(b.velocity);
    steering.limit(b.maxForce);
  }
  return steering;
}

// COHESION
function cohesionBoids(b, boids) {
  let perceptionRadius = 60;
  let steering = createVector();
  let total = 0;
  for (let other of boids) {
    let d = dist(
      b.position.x,
      b.position.y,
      other.position.x,
      other.position.y
    );
    if (other != b && d < perceptionRadius) {
      steering.add(other.position);
      total++;
    }
  }
  if (total > 0) {
    steering.div(total);
    steering.sub(b.position);
    steering.setMag(b.maxSpeed);
    steering.sub(b.velocity);
    steering.limit(b.maxForce);
  }
  return steering;
}

// SEPARATION
function separationBoids(b, boids) {
  let perceptionRadius = 50;
  let steering = createVector();
  let total = 0;
  for (let other of boids) {
    let d = dist(
      b.position.x,
      b.position.y,
      other.position.x,
      other.position.y
    );
    if (other != b && d < perceptionRadius) {
      let diff = p5.Vector.sub(b.position, other.position);
      diff.div(d);
      steering.add(diff);
      total++;
    }
  }
  if (total > 0) {
    steering.div(total);
    steering.setMag(b.maxSpeed);
    steering.sub(b.velocity);
    steering.limit(b.maxForce);
  }
  return steering;
}

//DRAW HAND
function drawHand() {
  if (predictions.length > 0) {
    handDetected = true;

    let hand = predictions[0];

    let indexFinger = hand.landmarks[8];

    let x = map(indexFinger[0], 0, video.width, video.width, 0);
    let y = map(indexFinger[1], 0, video.height, 0, height);

    fill(255, 255, 255, 80);
    noStroke();
    ellipse(x, y, obstacleRadius);

    obstaclePosition = createVector(x, y);
  } else {
    handDetected = false;
    obstaclePosition = null;
  }
}

// AVOID OBSTACLE FUNCTION
function avoidObstacle(b, behavior) {
  let avoidanceForce = createVector(0, 0);
  let obstacleDist = dist(
    b.position.x,
    b.position.y,
    obstaclePosition.x,
    obstaclePosition.y
  );

  //avoidance factor for the normal ones
  let avoidanceFactor = 1.0;

  if (behavior === "extrovert") {
    avoidanceFactor = -2;
    // extroverted boids are more attracted to the obstacle
  } else if (behavior === "introvert") {
    avoidanceFactor = 100.0;
    // introverted boids are more avoidant of the obstacle
  }

  if (obstacleDist < obstacleRadius + 100) {
    let diff = p5.Vector.sub(b.position, obstaclePosition);
    diff.setMag(b.maxSpeed * avoidanceFactor);
    diff.sub(b.velocity);
    diff.limit(b.maxForce);
    avoidanceForce.add(diff);
  }

  return avoidanceForce;
}
