import { generateSectionName, generateSectionPrefix } from '../sectionNameGenerator';

describe('sectionNameGenerator', () => {
  describe('generateSectionPrefix', () => {
    it('should generate prefix without major', () => {
      const prefix = generateSectionPrefix('BSIT', null, 1);
      expect(prefix).toBe('BSIT1');
    });

    it('should generate prefix with major', () => {
      const prefix = generateSectionPrefix('BSED', 'Filipino', 1);
      expect(prefix).toBe('BSEDFI1');
    });

    it('should handle different year levels', () => {
      const prefix1 = generateSectionPrefix('BSIT', null, 1);
      const prefix2 = generateSectionPrefix('BSIT', null, 2);
      const prefix3 = generateSectionPrefix('BSIT', null, 3);
      const prefix4 = generateSectionPrefix('BSIT', null, 4);
      
      expect(prefix1).toBe('BSIT1');
      expect(prefix2).toBe('BSIT2');
      expect(prefix3).toBe('BSIT3');
      expect(prefix4).toBe('BSIT4');
    });

    it('should extract first 2 letters of major in uppercase', () => {
      const prefix1 = generateSectionPrefix('BSED', 'English', 1);
      const prefix2 = generateSectionPrefix('BSED', 'Mathematics', 1);
      const prefix3 = generateSectionPrefix('BSED', 'Science', 1);
      
      expect(prefix1).toBe('BSEDEN1');
      expect(prefix2).toBe('BSEDMA1');
      expect(prefix3).toBe('BSEDSC1');
    });
  });

  describe('generateSectionName', () => {
    it('should generate section name with count 1 when no existing sections', () => {
      const name = generateSectionName('BSIT', null, 1, []);
      expect(name).toBe('BSIT1 - 1');
    });

    it('should auto-increment count based on existing sections', () => {
      const existing = ['BSIT1 - 1', 'BSIT1 - 2'];
      const name = generateSectionName('BSIT', null, 1, existing);
      expect(name).toBe('BSIT1 - 3');
    });

    it('should generate section name with major', () => {
      const name = generateSectionName('BSED', 'Filipino', 1, []);
      expect(name).toBe('BSEDFI1 - 1');
    });

    it('should auto-increment with major', () => {
      const existing = ['BSEDFI1 - 1'];
      const name = generateSectionName('BSED', 'Filipino', 1, existing);
      expect(name).toBe('BSEDFI1 - 2');
    });

    it('should not count sections from different prefixes', () => {
      const existing = ['BSIT1 - 1', 'BSIT2 - 1', 'BSEDFI1 - 1'];
      const name = generateSectionName('BSIT', null, 1, existing);
      expect(name).toBe('BSIT1 - 2');
    });

    it('should handle multiple majors independently', () => {
      const existing = ['BSEDFI1 - 1', 'BSEDFI1 - 2', 'BSEDEN1 - 1'];
      
      const nameFilipino = generateSectionName('BSED', 'Filipino', 1, existing);
      const nameEnglish = generateSectionName('BSED', 'English', 1, existing);
      
      expect(nameFilipino).toBe('BSEDFI1 - 3');
      expect(nameEnglish).toBe('BSEDEN1 - 2');
    });

    it('should handle different year levels independently', () => {
      const existing = ['BSIT1 - 1', 'BSIT1 - 2', 'BSIT2 - 1'];
      
      const nameYear1 = generateSectionName('BSIT', null, 1, existing);
      const nameYear2 = generateSectionName('BSIT', null, 2, existing);
      
      expect(nameYear1).toBe('BSIT1 - 3');
      expect(nameYear2).toBe('BSIT2 - 2');
    });
  });
});
