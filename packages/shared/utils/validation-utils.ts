/**
 * Validation utilities for features
 */

export interface ValidationRule<T = unknown> {
  name: string;
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationSchema<T = unknown> {
  rules: ValidationRule<T>[];
  required?: boolean;
  defaultValue?: T;
}

export interface FieldValidation<T = unknown> {
  field: string;
  value: T;
  schema: ValidationSchema<T>;
  result: ValidationResult;
}

export interface FormValidation {
  isValid: boolean;
  fields: Record<string, FieldValidation>;
  errors: string[];
  warnings: string[];
}

// Built-in validation rules
export const validationRules = {
  required: (): ValidationRule => ({
    name: 'required',
    validate: (value: unknown) => value !== null && value !== undefined && value !== '',
    message: 'This field is required'
  }),

  minLength: (min: number): ValidationRule<string> => ({
    name: 'minLength',
    validate: (value: string) => typeof value === 'string' && value.length >= min,
    message: `Must be at least ${min} characters long`
  }),

  maxLength: (max: number): ValidationRule<string> => ({
    name: 'maxLength',
    validate: (value: string) => typeof value === 'string' && value.length <= max,
    message: `Must be no more than ${max} characters long`
  }),

  email: (): ValidationRule<string> => ({
    name: 'email',
    validate: (value: string) => {
      if (typeof value !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: 'Must be a valid email address'
  }),

  url: (): ValidationRule<string> => ({
    name: 'url',
    validate: (value: string) => {
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Must be a valid URL'
  }),

  numeric: (): ValidationRule => ({
    name: 'numeric',
    validate: (value: unknown) => {
      if (typeof value === 'number') return true;
      if (typeof value === 'string') {
        return !isNaN(Number(value)) && value.trim() !== '';
      }
      return false;
    },
    message: 'Must be a valid number'
  }),

  positive: (): ValidationRule<number> => ({
    name: 'positive',
    validate: (value: number) => typeof value === 'number' && value > 0,
    message: 'Must be a positive number'
  }),

  negative: (): ValidationRule<number> => ({
    name: 'negative',
    validate: (value: number) => typeof value === 'number' && value < 0,
    message: 'Must be a negative number'
  }),

  integer: (): ValidationRule<number> => ({
    name: 'integer',
    validate: (value: number) => typeof value === 'number' && Number.isInteger(value),
    message: 'Must be an integer'
  }),

  range: (min: number, max: number): ValidationRule<number> => ({
    name: 'range',
    validate: (value: number) => typeof value === 'number' && value >= min && value <= max,
    message: `Must be between ${min} and ${max}`
  }),

  pattern: (regex: RegExp): ValidationRule<string> => ({
    name: 'pattern',
    validate: (value: string) => typeof value === 'string' && regex.test(value),
    message: `Must match pattern: ${regex.source}`
  }),

  custom: <T>(validator: (value: T) => boolean, message: string): ValidationRule<T> => ({
    name: 'custom',
    validate: validator,
    message
  })
};

// Validation functions
export function validateField<T>(
  value: T,
  schema: ValidationSchema<T>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if required
  if (schema.required) {
    const requiredRule = validationRules.required();
    if (!requiredRule.validate(value)) {
      errors.push(requiredRule.message);
      return { isValid: false, errors, warnings };
    }
  }

  // Skip validation if value is empty and not required
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors, warnings };
  }

  // Apply rules
  schema.rules.forEach(rule => {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  schema: Record<keyof T, ValidationSchema>
): FormValidation {
  const fields: Record<string, FieldValidation> = {};
  let allValid = true;
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  Object.keys(schema).forEach(fieldName => {
    const fieldSchema = schema[fieldName as keyof T];
    const fieldValue = data[fieldName as keyof T];
    
    const result = validateField(fieldValue, fieldSchema);
    
    fields[fieldName] = {
      field: fieldName,
      value: fieldValue,
      schema: fieldSchema,
      result
    };

    if (!result.isValid) {
      allValid = false;
      allErrors.push(...result.errors);
    }

    allWarnings.push(...result.warnings);
  });

  return {
    isValid: allValid,
    fields,
    errors: allErrors,
    warnings: allWarnings
  };
}

export function createValidationSchema<T>(
  rules: ValidationRule<T>[],
  options: { required?: boolean; defaultValue?: T } = {}
): ValidationSchema<T> {
  return {
    rules,
    required: options.required || false,
    defaultValue: options.defaultValue
  };
}

export function combineValidationResults(results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

export function validateAsync<T>(
  value: T,
  asyncValidators: Array<(value: T) => Promise<ValidationResult>>
): Promise<ValidationResult> {
  return Promise.all(asyncValidators.map(validator => validator(value)))
    .then(combineValidationResults);
}

export function debounceValidation<T>(
  validator: (value: T) => ValidationResult,
  delay: number = 300
): (value: T) => Promise<ValidationResult> {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (value: T): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        resolve(validator(value));
      }, delay);
    });
  };
}

export function createFieldValidator<T>(
  schema: ValidationSchema<T>
): {
  validate: (value: T) => ValidationResult;
  validateAsync: (value: T, asyncValidators?: Array<(value: T) => Promise<ValidationResult>>) => Promise<ValidationResult>;
  debounced: (value: T, delay?: number) => Promise<ValidationResult>;
} {
  const validate = (value: T) => validateField(value, schema);
  
  const validateAsync = async (
    value: T,
    asyncValidators: Array<(value: T) => Promise<ValidationResult>> = []
  ) => {
    const syncResult = validate(value);
    const asyncResults = await Promise.all(
      asyncValidators.map(validator => validator(value))
    );
    
    return combineValidationResults([syncResult, ...asyncResults]);
  };

  const debounced = debounceValidation(validate);

  return {
    validate,
    validateAsync,
    debounced
  };
}

import { ValidationError as FeatureValidationError } from '../errors/feature-error';

export function isValidationError(error: unknown): error is FeatureValidationError {
  return error instanceof FeatureValidationError;
}

export class FormValidationError extends Error {
  public readonly errors: string[];
  public readonly warnings: string[];

  constructor(message: string, errors: string[] = [], warnings: string[] = []) {
    super(message);
    this.name = 'FormValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }

  static fromValidationResult(result: ValidationResult, message?: string): FormValidationError {
    return new FormValidationError(
      message || 'Validation failed',
      result.errors,
      result.warnings
    );
  }
}

export const validationUtils = {
  validateField,
  validateForm,
  createValidationSchema,
  combineValidationResults,
  validateAsync,
  debounceValidation,
  createFieldValidator,
  isValidationError,
  FormValidationError,
  rules: validationRules
};
