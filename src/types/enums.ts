export enum UserRole {
  ADMIN = 'ADMIN',
  COLLEGE = 'COLLEGE',
  DRIVER = 'DRIVER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
}

export { UserRole as Role };

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEACTIVATED = 'DEACTIVATED',
}

export enum BusStatus {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  STOPPED = 'STOPPED',
  DELAYED = 'DELAYED',
  OFFLINE = 'OFFLINE',
}

export enum TrackingStatus {
  LIVE = 'LIVE',
  STALE = 'STALE',
  OFFLINE = 'OFFLINE',
}

export enum MediaType {
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  CAROUSEL_IMAGE = 'CAROUSEL_IMAGE',
  STORE_LOGO = 'STORE_LOGO',
  BLOG_THUMBNAIL = 'BLOG_THUMBNAIL',
  CAREER_CV = 'CAREER_CV',
}

export enum ShiftStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TripType {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  BOTH = 'BOTH',
}

export enum AssignmentType {
  PICKUP = 'PICKUP',
  DROP = 'DROP',
  BOTH = 'BOTH',
}
