/**
 * 3D Vector class for orbital calculations
 */
export class Vector3D {
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Add another vector to this one
   */
  add(v: Vector3D): Vector3D {
    return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /**
   * Subtract another vector from this one
   */
  sub(v: Vector3D): Vector3D {
    return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /**
   * Multiply this vector by a scalar
   */
  mul(n: number): Vector3D {
    return new Vector3D(this.x * n, this.y * n, this.z * n);
  }

  /**
   * Divide this vector by a scalar
   */
  div(n: number): Vector3D {
    if (n === 0) {
      console.error('Cannot divide by zero');
      return new Vector3D(0, 0, 0);
    }
    return new Vector3D(this.x / n, this.y / n, this.z / n);
  }

  /**
   * Get the magnitude (length) of this vector
   */
  abs(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Get the distance between this vector and another
   */
  dist(v: Vector3D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Normalize this vector (make it unit length)
   */
  norm(): Vector3D {
    const mag = this.abs();
    if (mag === 0) {
      return new Vector3D(0, 0, 0);
    }
    return this.div(mag);
  }

  /**
   * Cap the magnitude of this vector to a maximum value
   */
  max(maxValue: number): Vector3D {
    const mag = this.abs();
    if (mag > maxValue) {
      return this.norm().mul(maxValue);
    }
    return new Vector3D(this.x, this.y, this.z);
  }

  /**
   * Clone this vector
   */
  clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }

  /**
   * Convert to a string representation
   */
  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
  }
}
