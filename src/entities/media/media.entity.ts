import { Column, Entity } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { MediaType } from '../../types/enums';

@Entity({ name: 'media' })
export class Media extends CommonEntity {
  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column({
    type: 'enum',
    enum: MediaType,
    default: MediaType.PROFILE_IMAGE,
  })
  mediaType: MediaType;
}
