/**
 * Validation Utilities
 * Terinspirasi dari spmb-frontend dengan validasi yang lengkap dan user-friendly
 */

// ===============================
// VALIDATION FUNCTIONS
// ===============================

/**
 * Validate NIK (16 digit)
 */
export const validateNIK = (nik, isRequired = true) => {
  if (!nik && !isRequired) return { valid: true };
  if (!nik && isRequired) return { valid: false, error: 'NIK wajib diisi' };
  
  const cleaned = nik.toString().replace(/\D/g, '');
  
  if (cleaned.length !== 16) {
    return { valid: false, error: 'NIK harus 16 digit angka' };
  }
  
  return { valid: true, value: cleaned };
};

/**
 * Validate NISN (10 digit, optional)
 */
export const validateNISN = (nisn) => {
  if (!nisn) return { valid: true };
  
  const cleaned = nisn.toString().replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return { valid: false, error: 'NISN harus 10 digit angka' };
  }
  
  return { valid: true, value: cleaned };
};

/**
 * Validate Phone Number (Indonesian format)
 */
export const validatePhone = (phone, isRequired = true) => {
  if (!phone && !isRequired) return { valid: true };
  if (!phone && isRequired) return { valid: false, error: 'Nomor HP wajib diisi' };
  
  const cleaned = phone.toString().replace(/\D/g, '');
  
  // Indonesian phone format: 08xx or 628xx (10-13 digits)
  if (!/^(08|628)\d{8,11}$/.test(cleaned)) {
    return { valid: false, error: 'Format: 08xxxxxxxxxx (10-13 digit)' };
  }
  
  return { valid: true, value: cleaned };
};

/**
 * Validate Email (optional by default)
 */
export const validateEmail = (email, isRequired = false) => {
  if (!email && !isRequired) return { valid: true };
  if (!email && isRequired) return { valid: false, error: 'Email wajib diisi' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Format email tidak valid' };
  }
  
  return { valid: true, value: email.toLowerCase().trim() };
};

/**
 * Validate Required Text Field
 */
export const validateRequired = (value, fieldName, minLength = 1) => {
  if (!value || value.toString().trim().length < minLength) {
    return { 
      valid: false, 
      error: minLength > 1 
        ? `${fieldName} minimal ${minLength} karakter` 
        : `${fieldName} wajib diisi` 
    };
  }
  
  return { valid: true, value: value.toString().trim() };
};

/**
 * Validate Date of Birth
 */
export const validateDateOfBirth = (dateString, minAge = 4, maxAge = 10) => {
  if (!dateString) {
    return { valid: false, error: 'Tanggal lahir wajib diisi' };
  }
  
  const birthDate = new Date(dateString);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) {
    return { valid: false, error: 'Format tanggal tidak valid' };
  }
  
  if (birthDate > today) {
    return { valid: false, error: 'Tanggal lahir tidak boleh di masa depan' };
  }
  
  const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  
  if (age < minAge || age > maxAge) {
    return { valid: false, error: `Usia harus antara ${minAge}-${maxAge} tahun` };
  }
  
  return { valid: true, value: dateString, age };
};

/**
 * Validate Parent Date of Birth (18-80 years)
 */
export const validateParentDOB = (dateString) => {
  if (!dateString) {
    return { valid: false, error: 'Tanggal lahir wajib diisi' };
  }
  
  const birthDate = new Date(dateString);
  const today = new Date();
  
  if (birthDate > today) {
    return { valid: false, error: 'Tanggal lahir tidak boleh di masa depan' };
  }
  
  const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  
  if (age < 18 || age > 80) {
    return { valid: false, error: 'Usia orang tua harus 18-80 tahun' };
  }
  
  return { valid: true, value: dateString, age };
};

/**
 * Validate File Upload
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSizeMB = 2,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    isRequired = false
  } = options;
  
  if (!file) {
    return isRequired 
      ? { valid: false, error: 'File wajib diupload' }
      : { valid: true };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Format file harus JPG, PNG, atau PDF' };
  }
  
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: `Ukuran file maksimal ${maxSizeMB}MB` };
  }
  
  return { valid: true, value: file };
};

/**
 * Validate Sibling Logic (anak ke-X dari Y saudara)
 */
export const validateSiblingLogic = (anakKe, jumlahSaudara) => {
  const childNumber = parseInt(anakKe);
  const siblingCount = parseInt(jumlahSaudara);
  
  if (isNaN(childNumber) || childNumber < 1) {
    return { valid: false, error: 'Anak ke- harus minimal 1' };
  }
  
  if (isNaN(siblingCount) || siblingCount < 0) {
    return { valid: false, error: 'Jumlah saudara harus >= 0' };
  }
  
  // Logic: jumlah_saudara >= anak_ke - 1
  if (siblingCount < childNumber - 1) {
    return { 
      valid: false, 
      error: `Jika anak ke-${childNumber}, jumlah saudara minimal ${childNumber - 1}` 
    };
  }
  
  return { valid: true };
};

// ===============================
// SANITIZATION FUNCTIONS
// ===============================

/**
 * Sanitize text input (remove XSS vectors)
 */
export const sanitizeText = (input) => {
  if (typeof input !== 'string') return input?.toString() || '';
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Sanitize and normalize phone number
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/\D/g, '');
  // Convert 08xx to 628xx if needed
  if (cleaned.startsWith('08')) {
    return '62' + cleaned.slice(1);
  }
  return cleaned;
};

// ===============================
// FORM VALIDATION HELPER
// ===============================

/**
 * Validate entire form step and return all errors
 */
export const validateFormStep = (data, validationRules) => {
  const errors = {};
  const errorList = [];
  
  for (const [field, rules] of Object.entries(validationRules)) {
    const value = data[field];
    
    for (const rule of rules) {
      const result = rule.validate(value, data);
      
      if (!result.valid) {
        errors[field] = result.error;
        errorList.push(rule.label ? `${rule.label}: ${result.error}` : result.error);
        break; // Stop at first error for this field
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    errorList
  };
};

// ===============================
// PREDEFINED VALIDATION RULES
// ===============================

export const VALIDATION_RULES = {
  // Student
  nik: [
    { label: 'NIK', validate: (v) => validateNIK(v, true) }
  ],
  namaLengkap: [
    { label: 'Nama Lengkap', validate: (v) => validateRequired(v, 'Nama lengkap', 3) }
  ],
  namaPanggilan: [
    { label: 'Nama Panggilan', validate: (v) => validateRequired(v, 'Nama panggilan', 2) }
  ],
  tempatLahir: [
    { label: 'Tempat Lahir', validate: (v) => validateRequired(v, 'Tempat lahir', 3) }
  ],
  tanggalLahir: [
    { label: 'Tanggal Lahir', validate: (v) => validateDateOfBirth(v, 4, 10) }
  ],
  alamatKK: [
    { label: 'Alamat KK', validate: (v) => validateRequired(v, 'Alamat', 10) }
  ],
  
  // Parent
  noHpAyah: [
    { label: 'No. HP Ayah', validate: (v) => validatePhone(v, true) }
  ],
  noHpIbu: [
    { label: 'No. HP Ibu', validate: (v) => validatePhone(v, true) }
  ],
  emailAyah: [
    { label: 'Email Ayah', validate: (v) => validateEmail(v, false) }
  ],
  emailIbu: [
    { label: 'Email Ibu', validate: (v) => validateEmail(v, false) }
  ]
};

export default {
  validateNIK,
  validateNISN,
  validatePhone,
  validateEmail,
  validateRequired,
  validateDateOfBirth,
  validateParentDOB,
  validateFile,
  validateSiblingLogic,
  sanitizeText,
  normalizePhone,
  validateFormStep,
  VALIDATION_RULES
};
