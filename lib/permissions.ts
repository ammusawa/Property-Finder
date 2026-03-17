import { UserRole } from '@/types';

/**
 * Check if a user has admin privileges
 */
export function isAdmin(role?: UserRole): boolean {
  return role === 'admin';
}

/**
 * Check if a user can manage properties (admin, moderator, agent, owner)
 */
export function canManageProperties(role?: UserRole): boolean {
  return role === 'admin' || role === 'moderator' || role === 'agent' || role === 'owner';
}

/**
 * Check if a user can create properties (admin, agent, owner)
 */
export function canCreateProperties(role?: UserRole): boolean {
  return role === 'admin' || role === 'agent' || role === 'owner';
}

/**
 * Check if a user can edit any property (admin, moderator)
 */
export function canEditAnyProperty(role?: UserRole): boolean {
  return role === 'admin' || role === 'moderator';
}

/**
 * Check if a user can delete properties (admin, moderator)
 */
export function canDeleteProperties(role?: UserRole): boolean {
  return role === 'admin' || role === 'moderator';
}

/**
 * Check if a user can moderate content (admin, moderator)
 */
export function canModerate(role?: UserRole): boolean {
  return role === 'admin' || role === 'moderator';
}

/**
 * Check if a user has elevated privileges (admin, moderator)
 */
export function hasElevatedPrivileges(role?: UserRole): boolean {
  return role === 'admin' || role === 'moderator';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role?: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    user: 'User',
    admin: 'Administrator',
    agent: 'Agent',
    owner: 'Property Owner',
    moderator: 'Moderator',
  };
  return roleNames[role || 'user'] || 'User';
}

