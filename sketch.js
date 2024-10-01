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

window.addEventListener("load", () => {
  player = new Tone.Player("/nikes.mp3");
  oscillator = new Tone.Oscillator(440, "sine").toDestination();

  analyser = new Tone.Analyser("fft", 512);

  mic = new Tone.UserMedia();

  oscillator.connect(analyser);
  oscillator.toDestination();
  player.connect(analyser);
  player.toDestination();
  mic.connect(analyser);
});

window.addEventListener("click", () => {
  player.start();
  for (let i = 0; i < 100; i++) {
    flock.push(createBoid());
  }
});

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(24);

  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide();

  // handpose = ml5.handpose(video);
  handpose = ml5.handpose(video, modelReady);
  handpose.on("predict", (results) => {
    predictions = results;
  });
}

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
    let frequencyValue = frequencyData[frequencyIndex];
    //this limits the frequency to 100

    boid.color = color(
      map(frequencyValue, -100, 0, 0, 255),
      random(255),
      random(255)
    );

    // change boid velocity depending of frequency from the song
    let newVelocity = p5.Vector.random2D().setMag(
      map(frequencyValue, -100, 0, 2, 100)
    );
    boid.velocity.lerp(newVelocity, 0.1);
    // helps to smoothly interpolate the velocity changes
    // lerp calcs the value between the new velocity and 0.1
    // https://p5js.org/reference/p5/lerp/

    showBoid(boid);
  }

  drawHand();
}

// CREATE
function createBoid() {
  return {
    position: createVector(random(width), random(height)),
    velocity: p5.Vector.random2D().setMag(random(2, 4)),
    acceleration: createVector(),
    maxForce: random(0.2, 0.8),
    maxSpeed: random(2, 6),
    color: color(random(10), random(255), random(255), random(2, 150)),
  };
}

// SHOW
function showBoid(b) {
  fill(b.color);
  noStroke();

  let angle = b.velocity.heading() + PI / 2;
  push();
  // translate(b.position.x, b.position.y);
  // rotate(angle);
  // beginShape();
  // vertex(0, -10);
  // vertex(-5, 10);
  // vertex(5, 10);
  // endShape(CLOSE);
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

    // we only take the first hand detected
    let hand = predictions[0];

    // get the index finger tip (landmark 8)
    // https://docs.ml5js.org/assets/handpose-keypoints-map.png
    let indexFinger = hand.landmarks[8];

    let x = map(indexFinger[0], 0, video.width, video.width, 0);
    let y = map(indexFinger[1], 0, video.height, 0, height);

    fill(255, 0, 0);
    noStroke();
    ellipse(x, y, 40);
  } else {
    handDetected = false;
  }
}
