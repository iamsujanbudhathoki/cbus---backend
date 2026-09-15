import { ArrayNotEmpty, IsArray, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MinLength } from 'class-validator';
import messages from '../constants/messages.constants';
import { regex } from '../constants/regex';


export class AdminAuthSchema {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(regex.PASSWORD_REGEX, {
    message: messages.passwordStrength
  })
  password!: string;
}
