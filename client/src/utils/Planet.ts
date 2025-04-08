import * as THREE from 'three';
import { Vector3D } from './Vector';
import { Article } from '../types/Article';

/**
 * Planet class representing an article in the orbital system
 */
export class Planet {
  // Static properties for the planetary system
  static planets: Planet[] = [];
  static grav: number = 2.0e-11; // Reduced gravitational constant for more stable orbits
  static velCap: boolean = true; // Whether to cap velocity
  static velCapVal: number = 0.03; // Further reduced maximum velocity
  static collisionSystem: boolean = false; // Whether to enable collisions
  static currentFollowed?: Planet; // Currently followed planet
  static eclipticForce: number = 0.0002; // Reduced force for more 3D orbits

  // Instance properties
  id: string;
  name: string;
  pos: Vector3D;
  vel: Vector3D;
  mass: number;
  radius: number;
  color: number;
  fixed: boolean;
  followed: boolean;
  article?: Article;
  planet: THREE.Mesh;
  label?: THREE.Sprite;

  /**
   * Create a new planet
   */
  constructor(
    id: string,
    name: string,
    x: number,
    y: number,
    z: number,
    velX: number,
    velY: number,
    velZ: number,
    mass: number,
    radius: number,
    color: number,
    fixed: boolean = false,
    followed: boolean = false,
    article?: Article
  ) {
    this.id = id;
    this.name = name;
    this.pos = new Vector3D(x, y, z);
    this.vel = new Vector3D(velX, velY, velZ);
    this.mass = mass;
    this.radius = radius;
    this.color = color;
    this.fixed = fixed;
    this.followed = followed;
    this.article = article;

    // Create the 3D object
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7,
      metalness: 0.3
    });
    this.planet = new THREE.Mesh(geometry, material);
    this.planet.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.planet.name = this.name;
    this.planet.userData = { id: this.id };

    // Add to the static list of planets
    Planet.planets.push(this);

    // Set as followed if needed
    if (this.followed) {
      if (Planet.currentFollowed) {
        Planet.currentFollowed.followed = false;
      }
      Planet.currentFollowed = this;
    }
  }

  /**
   * Create a text label for the planet
   */
  createLabel(scene: THREE.Scene): void {
    // If we already have a label, remove it
    if (this.label && scene.getObjectById(this.label.id)) {
      scene.remove(this.label);
    }

    // Create a canvas for the label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 256;
    canvas.height = 128;

    // Draw the text
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '24px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.fillText(this.name, canvas.width / 2, canvas.height / 2);

    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    this.label = new THREE.Sprite(material);
    
    // Position the label above the planet
    const labelScale = this.radius * 5;
    this.label.scale.set(labelScale, labelScale / 2, 1);
    this.label.position.set(this.pos.x, this.pos.y + this.radius * 1.5, this.pos.z);
    
    scene.add(this.label);
  }

  /**
   * Update the velocity based on gravitational forces
   */
  updateVelocity(): void {
    if (!this.fixed) {
      for (let i = 0; i < Planet.planets.length; ++i) {
        if (Planet.planets[i] !== this) {
          const forceDir = Planet.planets[i].pos.sub(this.pos).norm();
          
          // Calculate distance to prevent articles from getting too close to the sun
          const distance = this.pos.dist(Planet.planets[i].pos);
          
          // Apply a minimum distance threshold to prevent articles from falling into the sun
          const effectiveDistance = Math.max(distance, 2.5);
          
          // Calculate force with dampening factor for slower movement
          const force = forceDir.mul(
            (Planet.grav * this.mass * Planet.planets[i].mass) / 
            (effectiveDistance * effectiveDistance * effectiveDistance) // Cube the distance for more stable orbits
          );
          
          // Apply a dampening factor to slow down movement
          const dampening = 0.9;
          const acc = force.div(this.mass).mul(dampening);
          
          this.vel = this.vel.add(acc);
          
          if (Planet.velCap && this.vel.abs() > Planet.velCapVal) {
            this.vel = this.vel.max(Planet.velCapVal - 0.001);
          }
        }
      }
      
      // Apply a very gentle force toward the ecliptic plane (y=0)
      // Only for extreme deviations to prevent completely chaotic orbits
      if (Math.abs(this.pos.y) > this.radius * 10) { // Only apply for significant deviations
        const eclipticForce = new Vector3D(0, -Math.sign(this.pos.y) * Planet.eclipticForce, 0);
        this.vel = this.vel.add(eclipticForce);
      }
      
      // Apply minimal velocity dampening in the y direction
      // Just enough to prevent extreme oscillations
      this.vel.y *= 0.995; // Very gradually reduce vertical velocity
    }
  }

  /**
   * Update the position based on velocity
   */
  updatePosition(): void {
    if (!this.fixed) {
      // Apply a time factor to speed up the simulation
      const timeScale = 1.2; // Slightly reduced time scale for more stability
      const scaledVelocity = this.vel.mul(timeScale);
      this.pos = this.pos.add(scaledVelocity);
      
      // Apply a small attraction toward the sun (0,0,0) to prevent drifting
      const distanceToSun = Math.sqrt(this.pos.x * this.pos.x + this.pos.y * this.pos.y + this.pos.z * this.pos.z);
      if (distanceToSun > 40) { // Only apply if too far away
        const sunDirection = new Vector3D(-this.pos.x / distanceToSun, -this.pos.y / distanceToSun, -this.pos.z / distanceToSun);
        this.pos = this.pos.add(sunDirection.mul(0.01)); // Small constant pull toward sun
      }
      
      this.planet.position.set(this.pos.x, this.pos.y, this.pos.z);
      
      // Update label position if it exists
      if (this.label) {
        this.label.position.set(this.pos.x, this.pos.y + this.radius * 1.5, this.pos.z);
      }
    }
  }

  /**
   * Remove the planet from the scene and the static list
   */
  removePlanet(scene: THREE.Scene): void {
    // Remove the 3D object
    if (scene.getObjectByName(this.name)) {
      scene.remove(this.planet);
    }
    
    // Remove the label if it exists
    if (this.label && scene.getObjectById(this.label.id)) {
      scene.remove(this.label);
    }
    
    // Remove from the static list
    for (let i = 0; i < Planet.planets.length; ++i) {
      if (Planet.planets[i] === this) {
        Planet.planets.splice(i, 1);
        break;
      }
    }
    
    // Reset current followed if needed
    if (Planet.currentFollowed === this) {
      Planet.currentFollowed = undefined;
    }
  }

  /**
   * Detect and handle collisions with other planets
   */
  collisionDetection(scene: THREE.Scene): void {
    if (!Planet.collisionSystem) return;
    
    for (let i = 0; i < Planet.planets.length; ++i) {
      if (Planet.planets[i] !== this) {
        if (this.pos.dist(Planet.planets[i].pos) < this.radius + Planet.planets[i].radius) {
          if (this.mass < Planet.planets[i].mass) {
            Planet.planets[i].mass += this.mass;
            console.log(`${Planet.planets[i].name} absorbed ${this.name}`);
            this.removePlanet(scene);
          } else if (this.mass > Planet.planets[i].mass) {
            this.mass += Planet.planets[i].mass;
            console.log(`${this.name} absorbed ${Planet.planets[i].name}`);
            Planet.planets[i].removePlanet(scene);
          } else {
            if (Math.random() >= 0.5) {
              Planet.planets[i].mass += this.mass;
              console.log(`${Planet.planets[i].name} absorbed ${this.name}`);
              this.removePlanet(scene);
            } else {
              this.mass += Planet.planets[i].mass;
              console.log(`${this.name} absorbed ${Planet.planets[i].name}`);
              Planet.planets[i].removePlanet(scene);
            }
          }
        }
      }
    }
  }

  /**
   * Create a planet from an article
   */
  static fromArticle(article: Article, scene: THREE.Scene): Planet {
    // Generate a color based on the article source
    const getColorFromSource = (source: string): number => {
      switch (source.toLowerCase()) {
        case 'reddit':
          return 0xff4500; // Reddit orange
        case 'twitter':
          return 0x1da1f2; // Twitter blue
        case 'washington_post':
          return 0x000000; // Black
        default:
          return 0xffffff; // White
      }
    };
    
    // Calculate position vector from sun to article
    const posX = article.position.x;
    const posY = article.position.y;
    const posZ = article.position.z;
    
    // Calculate distance from the sun (assuming sun is at 0,0,0)
    const distanceFromSun = Math.sqrt(posX * posX + posZ * posZ);
    
    // Calculate base orbital velocity (simplified formula for circular orbit)
    // v = sqrt(G * M / r) where G is gravitational constant, M is sun's mass, r is distance
    const sunMass = 50000000; // From the sun's mass in OrbitalSystem.createSun()
    const baseOrbitalSpeed = Math.sqrt((Planet.grav * sunMass) / distanceFromSun);
    
    // Calculate direction vector from sun to article
    const angle = Math.atan2(posZ, posX);
    
    // Calculate perpendicular direction for tangential velocity
    // For elliptical orbit, we'll use a factor between 0.3 and 0.5 of the circular velocity
    // This creates a more stable elliptical orbit with much lower initial velocity
    const ellipticalFactor = 0.3 + (Math.random() * 0.2); // Between 0.3 and 0.5
    const orbitalSpeed = baseOrbitalSpeed * ellipticalFactor;
    
    // Calculate velocity components perpendicular to radius vector
    const velX = -orbitalSpeed * Math.sin(angle);
    const velZ = orbitalSpeed * Math.cos(angle);
    
    // Add a small random vertical velocity component for variety
    // This will create slightly inclined orbits
    const velY = (Math.random() - 0.5) * 0.01;

    // Create a new planet
    const planet = new Planet(
      article.id,
      article.title.length > 20 ? article.title.substring(0, 20) + '...' : article.title,
      posX,
      posY,
      posZ,
      velX, // Initial tangential velocity x
      velY, // Small random vertical velocity
      velZ, // Initial tangential velocity z
      article.mass,
      Math.max(0.1, Math.min(0.5, article.mass / 200000)), // Scale radius based on mass
      getColorFromSource(article.source),
      false, // Not fixed
      false, // Not followed
      article
    );

    // Add the planet to the scene
    scene.add(planet.planet);
    planet.createLabel(scene);

    return planet;
  }
}
