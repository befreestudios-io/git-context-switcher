/**
 * Tests for the Context class
 */
import { jest, describe, test, expect } from '@jest/globals';
import { Context } from '../../lib/models/Context.js';

describe('Context', () => {
  describe('constructor', () => {
    test('should create a context with all properties', () => {
      const context = new Context('work', 'Work Context', ['~/work', '/projects/work'], {
        'user.name': 'Work User',
        'user.email': 'work@example.com'
      });
      
      expect(context.name).toBe('work');
      expect(context.description).toBe('Work Context');
      expect(context.pathPatterns).toEqual(['~/work', '/projects/work']);
      expect(context.gitConfig).toEqual({
        'user.name': 'Work User',
        'user.email': 'work@example.com'
      });
    });
    
    test('should create a context with only required properties', () => {
      const context = new Context('personal');
      
      expect(context.name).toBe('personal');
      expect(context.description).toBe('');
      expect(context.pathPatterns).toEqual([]);
      expect(context.gitConfig).toEqual({});
    });
    
    test('should create a context with default values for optional properties', () => {
      const context = new Context('home', 'Home Projects');
      
      expect(context.name).toBe('home');
      expect(context.description).toBe('Home Projects');
      expect(context.pathPatterns).toEqual([]);
      expect(context.gitConfig).toEqual({});
    });
  });
  
  describe('validate', () => {
    test('should validate a valid context', () => {
      const context = new Context('work', 'Work Context', ['~/work'], {
        'user.name': 'Work User',
        'user.email': 'work@example.com'
      });
      
      const { valid, errors } = context.validate();
      
      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });
    
    test('should invalidate a context with no name', () => {
      const context = new Context('');
      
      const { valid, errors } = context.validate();
      
      expect(valid).toBe(false);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('name');
    });
    
    test('should invalidate a context with invalid name characters', () => {
      const context = new Context('work;rm -rf /');
      
      const { valid, errors } = context.validate();
      
      expect(valid).toBe(false);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('name');
    });
    
    test('should validate a context with minimum valid properties', () => {
      const context = new Context('minimal');
      
      const { valid, errors } = context.validate();
      
      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });
  });
  
  describe('fromObject', () => {
    test('should create context from object with all properties', () => {
      const obj = {
        name: 'work',
        description: 'Work Context',
        pathPatterns: ['~/work', '/projects/work'],
        gitConfig: {
          'user.name': 'Work User',
          'user.email': 'work@example.com'
        }
      };
      
      const context = Context.fromObject(obj);
      
      expect(context).toBeInstanceOf(Context);
      expect(context.name).toBe('work');
      expect(context.description).toBe('Work Context');
      expect(context.pathPatterns).toEqual(['~/work', '/projects/work']);
      expect(context.gitConfig).toEqual({
        'user.name': 'Work User',
        'user.email': 'work@example.com'
      });
    });
    
    test('should create context from object with only name', () => {
      const obj = { name: 'minimal' };
      
      const context = Context.fromObject(obj);
      
      expect(context).toBeInstanceOf(Context);
      expect(context.name).toBe('minimal');
      expect(context.description).toBe('');
      expect(context.pathPatterns).toEqual([]);
      expect(context.gitConfig).toEqual({});
    });
    
    test('should handle null or undefined values', () => {
      const obj = { name: 'test', description: null, pathPatterns: undefined };
      
      const context = Context.fromObject(obj);
      
      expect(context).toBeInstanceOf(Context);
      expect(context.name).toBe('test');
      expect(context.description).toBe('');
      expect(context.pathPatterns).toEqual([]);
    });
    
    test('should throw error for object without name property', () => {
      const obj = { description: 'No Name' };
      
      expect(() => Context.fromObject(obj)).toThrow('Context requires a name');
    });
  });
  
  describe('toObject', () => {
    test('should convert context to plain object with all properties', () => {
      const context = new Context('work', 'Work Context', ['~/work'], {
        'user.name': 'Work User',
        'user.email': 'work@example.com'
      });
      
      const obj = context.toObject();
      
      expect(obj).toEqual({
        name: 'work',
        description: 'Work Context',
        pathPatterns: ['~/work'],
        gitConfig: {
          'user.name': 'Work User',
          'user.email': 'work@example.com'
        }
      });
    });
    
    test('should convert minimal context to plain object', () => {
      const context = new Context('minimal');
      
      const obj = context.toObject();
      
      expect(obj).toEqual({
        name: 'minimal',
        description: '',
        pathPatterns: [],
        gitConfig: {}
      });
    });
  });
});