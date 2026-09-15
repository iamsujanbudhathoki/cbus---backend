import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Media } from '../media/media.entity';

@Entity()
export class CareerEntity extends CommonEntity {
  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'email' })
  email: string;

  @Column({ name: 'opportunity_type' })
  opportunityType: string;

  @Column({ name: 'experience_level' })
  experienceLevel: string;

  @Column({ name: 'current_situation' })
  currentSituation: string;

  @Column({ name: 'availability' })
  availability: string;

  @Column({ name: 'why_interested' })
  whyInterested: string;

  @OneToOne(() => Media, { cascade: true, eager: true }) // eager = auto load
  @JoinColumn({ name: 'resume_id' }) // will create `resume_id` FK column
  resume: Media;
}
