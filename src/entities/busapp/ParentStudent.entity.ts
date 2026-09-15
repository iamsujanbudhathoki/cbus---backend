import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Parent } from './Parent.entity';
import { Student } from './Student.entity';

@Entity({ name: 'parent_students' })
export class ParentStudent extends CommonEntity {
  @Column()
  parentId: string;

  @ManyToOne(() => Parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @Column()
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ default: 'Guardian' })
  relationship: string;
}
