import { JwtPayload } from '../../auth/jwt/jwt-payload';

export function creatorFields(user?: JwtPayload) {
  return {
    createdBy: user?.id,
    creatorType: user?.type,
    creatorName: user?.userName,
  };
}

export function updaterFields(user?: JwtPayload) {
  return {
    updatedBy: user?.id,
    updaterType: user?.type,
    updaterName: user?.userName,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
