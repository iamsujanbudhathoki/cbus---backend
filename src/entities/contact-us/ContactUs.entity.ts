import { Column, Entity } from 'typeorm';
import { CommonEntity } from '../common/common.entity';

@Entity({
  name: 'contact_us',
})
export class ContactUsEntity extends CommonEntity {
  @Column({ name: 'name', length: 100 })
  name: string;

  @Column({ name: 'email', length: 150 })
  email: string;

  @Column({ name: 'phone', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'subject', length: 200 })
  subject: string;

  @Column({ name: 'message', type: 'text' })
  message: string;
}
