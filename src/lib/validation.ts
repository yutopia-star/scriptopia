import { PASSWORD_REQUIREMENTS, MIN_AGE } from '@/lib/constants';

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email address is required.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Please enter a valid email address.';
  return null;
}

export function validateEmailsMatch(email: string, confirm: string): string | null {
  if (email !== confirm) return 'Email addresses do not match.';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username.trim()) return 'Username is required.';
  if (username.trim().length < 3) return 'Username must be at least 3 characters.';
  if (username.trim().length > 30) return 'Username must be 30 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return 'Username can only contain letters, numbers and underscores.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters.`;
  }
  if (PASSWORD_REQUIREMENTS.needsUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (PASSWORD_REQUIREMENTS.needsLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (PASSWORD_REQUIREMENTS.needsNumber && !/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (PASSWORD_REQUIREMENTS.needsSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

export function validatePasswordsMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export function validateDateOfBirth(dob: string): string | null {
  if (!dob) return 'Date of birth is required.';
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return 'Please enter a valid date.';
  const today = new Date();
  if (birthDate > today) return 'Date of birth cannot be in the future.';
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old to use WhittleScript.`;
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} is required.`;
  return null;
}

export function validateUrl(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!parsed.hostname.includes('.')) return 'Please enter a valid URL.';
    return null;
  } catch {
    return 'Please enter a valid URL.';
  }
}

export function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= PASSWORD_REQUIREMENTS.minLength) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const idx = Math.min(score, labels.length - 1);
  return { score, label: labels[idx] };
}
