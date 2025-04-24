import { UserZipService } from '../../services/userZipService';
import { UserZipModel } from '../../models/UserZipSchema';

// Mock the UserZipModel
jest.mock('../../models/UserZipSchema', () => ({
  UserZipModel: {
    findOneAndUpdate: jest.fn()
  }
}));

describe('UserZipService', () => {
  let userZipService: UserZipService;
  
  beforeEach(() => {
    userZipService = new UserZipService();
    jest.clearAllMocks();
  });
  
  describe('recordZipUsage', () => {
    it('should record a valid zip code', async () => {
      const mockZipCode = '12345';
      const mockResult = {
        zipCode: mockZipCode,
        count: 1,
        lastUsed: new Date()
      };
      
      (UserZipModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await userZipService.recordZipUsage(mockZipCode);
      
      expect(UserZipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { zipCode: mockZipCode },
        { 
          $inc: { count: 1 },
          lastUsed: expect.any(Date)
        },
        { new: true, upsert: true }
      );
      
      expect(result).toEqual(mockResult);
    });
    
    it('should handle invalid zip codes', async () => {
      const invalidZipCodes = ['123', 'abcde', '1234a', ''];
      
      for (const zipCode of invalidZipCodes) {
        const result = await userZipService.recordZipUsage(zipCode);
        
        expect(result).toBeNull();
        expect(UserZipModel.findOneAndUpdate).not.toHaveBeenCalled();
      }
    });
    
    it('should handle database errors', async () => {
      const mockZipCode = '12345';
      const mockError = new Error('Database error');
      
      (UserZipModel.findOneAndUpdate as jest.Mock).mockRejectedValue(mockError);
      
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await userZipService.recordZipUsage(mockZipCode);
      
      expect(UserZipModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Error recording zip code usage for ${mockZipCode}:`,
        mockError
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should handle extended zip code format', async () => {
      const mockZipCode = '12345-6789';
      const mockResult = {
        zipCode: mockZipCode,
        count: 1,
        lastUsed: new Date()
      };
      
      (UserZipModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await userZipService.recordZipUsage(mockZipCode);
      
      expect(UserZipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { zipCode: mockZipCode },
        { 
          $inc: { count: 1 },
          lastUsed: expect.any(Date)
        },
        { new: true, upsert: true }
      );
      
      expect(result).toEqual(mockResult);
    });
  });
});
