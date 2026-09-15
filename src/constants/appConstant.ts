import { UserRole, Role, Status, BusStatus, TrackingStatus, MediaType, ShiftStatus, TripType, AssignmentType } from '../types/enums';

export { UserRole, Role, Status, BusStatus, TrackingStatus, MediaType, ShiftStatus, TripType, AssignmentType };

export default {
  APP_NAME: 'Bus Tracking Platform',
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 30,
};

export enum Environment {
  DEVELOPMENT = 'DEVELOPMENT',
  PRODUCTION = 'PRODUCTION',
  TEST = 'TEST',
}

export enum UserLoginType {
  TRADITIONAL = 'TRADITIONAL',
  GOOGLE = 'GOOGLE',
}

export enum TokenEnum {
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  ACCESS_TOKEN = 'ACCESS_TOKEN',
}
