import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { MediaType, UserLoginType } from '../../constants/appConstant';
import { Token } from '../token/Token.entity';
import { migrateMedia } from '../../utils/media/migrateMedia';
import { DotenvConfig } from '../../config/env.config';
import BcryptService from '../../utils/bcrypt.util';
import { Media } from '../media/media.entity';

@Entity({ name: 'associate_adviser' })
export class AdviserEntity extends CommonEntity {
  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  profession: string;

  @Column({ type: 'varchar', length: 255 })
  jobAt: string;

  @Column({ type: 'int' })
  experience: number;

  @Column({ type: 'text' })
  focusOn: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  specialities: string;

  @Column({ type: 'varchar', length: 255 })
  linkedinUrl: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  phone: string;

  @Column({ type: 'text', select: false })
  password: string;

  @OneToOne(() => Media)
  @JoinColumn()
  profileImage: Media;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'enum', enum: UserLoginType, default: UserLoginType.TRADITIONAL })
  loginType: UserLoginType;

  @OneToMany(() => Token, (token) => token.ownerId)
  token: Token;



  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await BcryptService.hash(this.password);
    }
  }
}
