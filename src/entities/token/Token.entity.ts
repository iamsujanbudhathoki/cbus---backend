import { Column, Entity, Unique } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { TokenEnum } from '../../constants/appConstant';

export enum TokenOwnerType {
  ADVISER = 'adviser',
  ADMIN = 'admin',
}

@Entity('token')
@Unique(['ownerId', 'ownerType', 'type'])
export class Token extends CommonEntity {
  @Column({ nullable: false })
  token: string;

  @Column({
    type: 'enum',
    enum: TokenEnum,
    nullable: false,
  })
  type: TokenEnum;

  @Column()
  ownerId: string;

  @Column({
    type: 'enum',
    enum: TokenOwnerType,
  })
  ownerType: TokenOwnerType;
}
