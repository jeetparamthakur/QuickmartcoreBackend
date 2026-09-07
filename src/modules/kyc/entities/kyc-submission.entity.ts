import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { KycStatus } from '../../../common/enums';
import { KycDocumentEntity } from './kyc-document.entity';

@Entity('kyc_submissions')
export class KycSubmissionEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  status!: KycStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @OneToMany(() => KycDocumentEntity, (doc) => doc.submission)
  documents!: KycDocumentEntity[];
}
