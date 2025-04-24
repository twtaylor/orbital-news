import { UserZipModel, UserZip } from '../models/UserZipSchema';

export class UserZipService {
  /**
   * Records a zip code usage
   * If the zip code already exists, increments the count and updates lastUsed
   * If it doesn't exist, creates a new entry
   * 
   * @param zipCode The zip code to record
   * @returns The updated or created UserZip document
   */
  async recordZipUsage(zipCode: string): Promise<UserZip | null> {
    if (!zipCode || !this.isValidZipCode(zipCode)) {
      return null;
    }

    try {
      // Try to update an existing record
      const result = await UserZipModel.findOneAndUpdate(
        { zipCode },
        { 
          $inc: { count: 1 },
          lastUsed: new Date()
        },
        { new: true, upsert: true }
      );
      
      return result;
    } catch (error) {
      console.error(`Error recording zip code usage for ${zipCode}:`, error);
      return null;
    }
  }

  /**
   * Validates if a string is a valid US zip code
   * 
   * @param zipCode The zip code to validate
   * @returns True if valid, false otherwise
   */
  private isValidZipCode(zipCode: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
  }
}

export default new UserZipService();
