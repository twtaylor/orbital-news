import * as THREE from 'three';
import { Vector3D } from './Vector';
import { Article } from '../types/Article';
import { OrbitalTier } from '../shared/constants';

/**
 * Planet class representing an article in the orbital system
 */
export class Planet {
  // Static properties for the planetary system
  static planets: Planet[] = [];
  static grav: number = 6.0e-11; // Dramatically increased gravitational constant
  static velCap: boolean = true; // Whether to cap velocity
  static velCapVal: number = 0.04; // Further reduced maximum velocity
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
  
  // Trail properties
  trailPoints: Vector3D[] = [];
  trailMaxLength: number = 500; // Maximum number of points in the trail
  trailUpdateFrequency: number = 5; // Update every N frames
  trailCounter: number = 0;
  trailLine?: THREE.Line;
  trailOpacity: number = 0.4; // Opacity of the trail

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
    this.planet.userData = { 
      id: this.id,
      planetId: this.id,
      article: this.article
    };

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
    
    // Don't create a label for the sun (center object named 'Local Group News')
    if (this.name === 'Local Group News') {
      return;
    }

    // Create a canvas for the label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    // Increase canvas size for longer text
    canvas.width = 512;
    canvas.height = 256;

    // Make canvas fully transparent
    // No background fill - leave the canvas transparent
    
    // Set up text properties with better visibility
    context.font = 'bold 20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add text stroke for better visibility against any background
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 4;
    context.fillStyle = '#ffffff';
    
    // Word wrap the text
    const maxWidth = canvas.width - 20; // Padding
    const lineHeight = 24;
    const words = this.name.split(' ');
    let line = '';
    let y = 40; // Starting y position
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        // Draw the line with stroke for better visibility
        context.strokeText(line, canvas.width / 2, y);
        context.fillText(line, canvas.width / 2, y);
        line = words[i] + ' ';
        y += lineHeight;
        
        // Check if we've reached the bottom of the canvas
        if (y > canvas.height - 40) {
          line += '...';
          context.strokeText(line, canvas.width / 2, y);
          context.fillText(line, canvas.width / 2, y);
          break;
        }
      } else {
        line = testLine;
      }
    }
    
    // Draw the last line if there's text left
    if (line.trim() !== '' && y <= canvas.height - 40) {
      context.strokeText(line, canvas.width / 2, y);
      context.fillText(line, canvas.width / 2, y);
    }

    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    
    // Create a sprite with the texture
    this.label = new THREE.Sprite(material);
    
    // Position the label above the planet
    const labelScale = this.radius * 6; // Increased from 5x to 6x for better visibility
    this.label.scale.set(labelScale * canvas.width / canvas.height, labelScale, 1);
    
    // Position the label above the planet (increased from 1.5x to 2.5x radius)
    const labelHeight = this.radius * 2.5;
    this.label.position.set(this.pos.x, this.pos.y + labelHeight, this.pos.z);
    
    // Set userData for click detection
    this.label.userData = {
      planetId: this.id,
      article: this.article
    };
    
    // Add the label to the scene
    scene.add(this.label);
  }

  /**
   * Update the velocity based on gravitational forces
   */
  updateVelocity(): void {
    if (!this.fixed) {
      // We'll only apply gravitational force from the sun (first planet)
      // This simplifies the physics and makes orbits more stable
      const sun = Planet.planets[0]; // Assuming the sun is always the first planet
      
      if (sun && sun !== this) {
        const forceDir = sun.pos.sub(this.pos).norm();
        
        // Calculate distance to the sun
        const distance = this.pos.dist(sun.pos);
        
        // Apply a minimum distance threshold to prevent articles from falling into the sun
        const effectiveDistance = Math.max(distance, 3.0);
        
        // Calculate gravitational force
        const force = forceDir.mul(
          (Planet.grav * this.mass * sun.mass) / 
          (effectiveDistance * effectiveDistance)
        );
        
        // Calculate acceleration
        const acc = force.div(this.mass);
        
        // Calculate angular momentum for current position and velocity
        const r = this.pos.sub(sun.pos);
        const angularMomentum = r.cross(this.vel);
        
        // Apply acceleration
        this.vel = this.vel.add(acc);
        
        // Apply angular momentum conservation to maintain stable orbits
        // This helps prevent articles from spiraling in or out
        if (distance > 5) { // Only apply for articles not too close to sun
          const newR = this.pos.sub(sun.pos);
          const newVelTangential = angularMomentum.cross(newR).div(newR.abs() * newR.abs());
          
          // Blend between current velocity and corrected velocity
          const blendFactor = 0.05; // Small adjustment per frame
          this.vel = this.vel.mul(1 - blendFactor).add(newVelTangential.mul(blendFactor));
        }
        
        // Apply velocity cap if needed
        if (Planet.velCap && this.vel.abs() > Planet.velCapVal) {
          this.vel = this.vel.norm().mul(Planet.velCapVal);
        }
      }
      
      // Apply a very gentle force toward the ecliptic plane (y=0)
      // Only for extreme deviations to prevent completely chaotic orbits
      if (Math.abs(this.pos.y) > this.radius * 10) {
        const eclipticForce = new Vector3D(0, -Math.sign(this.pos.y) * Planet.eclipticForce, 0);
        this.vel = this.vel.add(eclipticForce);
      }
      
      // Apply minimal velocity dampening in the y direction
      // Just enough to prevent extreme oscillations
      this.vel.y *= 0.995;
    }
  }

  /**
   * Update the position based on velocity
   */
  updatePosition(): void {
    if (!this.fixed) {
      // Apply a time factor to control simulation speed
      const timeScale = 0.5; // Reduced from 1.2 to slow down the simulation
      const scaledVelocity = this.vel.mul(timeScale);
      this.pos = this.pos.add(scaledVelocity);
      
      // Get the sun (first planet)
      const sun = Planet.planets.find(planet => planet.name === 'Local Group News');
      
      if (sun && sun !== this) {
        // Calculate distance to the sun
        const distanceToSun = this.pos.dist(sun.pos);
        
        // Enforce minimum distance to sun to prevent falling in
        if (distanceToSun < 5) {
          const pushDirection = this.pos.sub(sun.pos).norm();
          this.pos = sun.pos.add(pushDirection.mul(5));
          
          // Also adjust velocity to prevent further approach
          const radialVelocity = pushDirection.dot(this.vel);
          if (radialVelocity < 0) { // If moving toward sun
            this.vel = this.vel.sub(pushDirection.mul(radialVelocity * 1.5)); // Reverse and boost
          }
        }
        
        // Apply boundary forces to keep articles from drifting too far
        // This creates a soft boundary that pulls articles back toward the sun
        const maxDistance = 40; // Maximum allowed distance
        if (distanceToSun > maxDistance) {
          const pullDirection = sun.pos.sub(this.pos).norm();
          const pullStrength = 0.02 * (distanceToSun - maxDistance) / 10;
          this.pos = this.pos.add(pullDirection.mul(pullStrength));
          
          // Also add velocity toward sun
          this.vel = this.vel.add(pullDirection.mul(0.001));
        }
      }
      
      this.planet.position.set(this.pos.x, this.pos.y, this.pos.z);
      
      // Update label position if it exists
      if (this.label) {
        this.label.position.set(this.pos.x, this.pos.y + this.radius * 1.5, this.pos.z);
      }
      
      // Update trail (only for non-sun objects)
      if (this.name !== 'Local Group News') {
        this.updateTrail();
      }
    }
  }
  
  /**
   * Update the trail behind the planet
   */
  updateTrail(): void {
    // Only update trail every N frames to avoid too many points
    this.trailCounter++;
    if (this.trailCounter >= this.trailUpdateFrequency) {
      this.trailCounter = 0;
      
      // Add current position to trail points
      this.trailPoints.push(new Vector3D(this.pos.x, this.pos.y, this.pos.z));
      
      // Limit trail length
      if (this.trailPoints.length > this.trailMaxLength) {
        this.trailPoints.shift(); // Remove oldest point
      }
      
      // Update or create trail visualization
      this.updateTrailVisualization();
    }
  }
  
  /**
   * Create or update the visual representation of the trail
   */
  updateTrailVisualization(): void {
    // If we have trail points
    if (this.trailPoints.length > 1) {
      // Remove existing trail line if it exists
      if (this.trailLine && this.trailLine.parent) {
        this.trailLine.parent.remove(this.trailLine);
      }
      
      // Create points for the trail
      const points = this.trailPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
      
      // Create geometry for the line
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Create material with fading effect
      // Use grey color for black objects so trails are visible
      const trailColor = this.color === 0x000000 ? 0x666666 : this.color;
      const material = new THREE.LineBasicMaterial({
        color: trailColor,
        transparent: true,
        opacity: this.trailOpacity,
        linewidth: 1
      });
      
      // Create the line
      this.trailLine = new THREE.Line(geometry, material);
      
      // Add to the scene
      if (this.planet.parent) {
        this.planet.parent.add(this.trailLine);
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
    
    // Remove the trail if it exists
    if (this.trailLine && scene.getObjectById(this.trailLine.id)) {
      scene.remove(this.trailLine);
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
   * Calculate planet radius based on article content length
   * @param article The article to calculate radius for
   * @returns The calculated radius
   */
  static calculateRadiusFromContent(article: Article): number {
    // Default minimum and maximum radius values
    const minRadius = 0.07;
    const maxRadius = 0.25;
    
    // Get content length (use title length if content is missing)
    const contentLength = article.content ? article.content.length : article.title.length;
    
    // Calculate base radius from content length
    // Logarithmic scale to handle wide range of content lengths
    // ln(x+1) to handle empty content
    const baseRadius = Math.log(contentLength + 1) / 30;
    
    // Clamp radius between min and max values
    return Math.max(minRadius, Math.min(maxRadius, baseRadius));
  }
  
  /**
   * Get color based on tier
   */
  static getColorFromTier(tier: string): number {
    switch (tier) {
      case 'close':
        return 0x00ff00; // Green for close
      case 'medium':
        return 0x0000ff; // Blue for medium
      case 'far':
        return 0xff0000; // Red for far
      default:
        return 0xffffff; // White for unknown tier
    }
  }
  
  /**
   * Calculate position and velocity based on tier
   */
  static calculatePositionAndVelocity(tier: string): { posX: number, posY: number, posZ: number, velX: number, velY: number, velZ: number } {
    // Get base distance from tier
    let baseDistance: number;
    switch (tier) {
      case 'close':
        baseDistance = OrbitalTier.CLOSE;
        break;
      case 'medium':
        baseDistance = OrbitalTier.MEDIUM;
        break;
      case 'far':
        baseDistance = OrbitalTier.FAR;
        break;
      default:
        baseDistance = OrbitalTier.MEDIUM; // Default to medium if tier is invalid
    }
    
    // Add a small random variation to the base distance (±5%)
    const distance = baseDistance * (0.95 + Math.random() * 0.1);
    
    // Random angle around the sun
    const angle = Math.random() * Math.PI * 2;
    
    // Create 3D positions with elevation angles
    // Use a spherical distribution for a true 3D orbital system
    const elevationAngle = (Math.random() - 0.5) * Math.PI * 0.6; // -30 to +30 degrees from plane
    
    // Calculate position components using spherical coordinates
    const horizontalDistance = distance * Math.cos(Math.abs(elevationAngle));
    const posX = horizontalDistance * Math.cos(angle);
    const posY = distance * Math.sin(elevationAngle);
    const posZ = horizontalDistance * Math.sin(angle);
    
    // Calculate base orbital velocity (simplified formula for circular orbit)
    // v = sqrt(G * M / r) where G is gravitational constant, M is sun's mass, r is distance
    const sunMass = 50000000; // From the sun's mass in OrbitalSystem.createSun()
    const baseOrbitalSpeed = Math.sqrt((Planet.grav * sunMass) / distance);
    
    // For elliptical orbit, use a factor between 0.3 and 0.5 of the circular velocity
    const ellipticalFactor = 0.3 + (Math.random() * 0.2); // Between 0.3 and 0.5
    const orbitalSpeed = baseOrbitalSpeed * ellipticalFactor;
    
    // Calculate velocity components perpendicular to radius vector
    const velX = -orbitalSpeed * Math.sin(angle);
    const velZ = orbitalSpeed * Math.cos(angle);
    
    // Add a small random vertical velocity component for variety
    const velY = (Math.random() - 0.5) * 0.01;
    
    return { posX, posY, posZ, velX, velY, velZ };
  }
  
  /**
   * Create a planet from an article
   */
  static fromArticle(article: Article, scene: THREE.Scene): Planet {
    // Calculate position based on tier
    const { posX, posY, posZ, velX, velY, velZ } = Planet.calculatePositionAndVelocity(article.tier);
    
    // Create the planet
    const planet = new Planet(
      article.id,
      article.title,
      posX, posY, posZ,
      velX, velY, velZ,
      article.mass || 1000, // Default mass if not specified
      Planet.calculateRadiusFromContent(article),
      Planet.getColorFromTier(article.tier),
      false, // Not fixed
      false, // Not followed
      article
    );
    
    // Store the article data for selection
    planet.article = article;
    
    // Store article data in the mesh for raycasting
    planet.planet.userData.article = article;
    
    // Add to scene
    scene.add(planet.planet);
    
    // Create label
    planet.createLabel(scene);
    
    return planet;
  }
}
